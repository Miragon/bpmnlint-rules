import { collectByPlane, inst } from '../../lib/di';
import { attachSide, gatewayTipSide, isBackwardFlow } from '../../lib/geometry';
import type { Point, Rect, Side } from '../../lib/geometry';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

/**
 * Reports a sequence flow that docks onto a shape at the wrong side — an event entered from the top,
 * an activity exited to the left, a gateway connected on a diagonal flank instead of one of its
 * four tips.
 *
 * Only the DI coordinates decide: for each flow, the first waypoint is its exit off the source, the
 * last waypoint its entry into the target. Which side that point sits on is compared against
 * {@link POLICY}. Comparison is scoped per BPMNPlane; shapes with no category (data objects, pools,
 * lanes) and boundary events (which sit on their host's border) are left alone.
 *
 * A **return flow** — one whose target is drawn clearly left of its source (see
 * {@link isBackwardFlow}) — is a legitimate right-to-left loop-back, so its policy is mirrored
 * left ↔ right: it may enter a shape from the right and leave to the left. The docking is still
 * checked, just against the mirrored sides, so a return flow that wraps into the wrong face is
 * still reported.
 *
 * Configuration (optional):
 *
 *     "miragon/flow-connection-side": [ "error", { "allowBackwardsFlow": false } ]
 *
 * `allowBackwardsFlow` defaults to `true` (return flows are mirrored, as above). Set it to `false`
 * to hold every flow to the strict left-to-right policy, so a return flow's docking is reported like
 * any other wrong-side connection.
 */

export interface FlowConnectionSideConfig {
  allowBackwardsFlow?: boolean;
}

type Category = 'event' | 'gateway' | 'activity';
type Direction = 'incoming' | 'outgoing';

/**
 * The allowed docking sides per flow direction and element category — the single place to change
 * what counts as a clean connection. `incoming` is the target end of a flow, `outgoing` the source
 * end. Reads as a left-to-right model: the main flow always enters on the left. Activities exit to
 * the right; events and gateways may branch out any side *except* the incoming-left one (an event
 * behaves like a gateway here). A gateway is additionally only ever connected at one of its four tips.
 */
const POLICY: Record<Direction, Record<Category, Side[]>> = {
  incoming: {
    event: ['left'],
    activity: ['left'],
    gateway: ['top', 'right', 'bottom', 'left'],
  },
  outgoing: {
    event: ['top', 'right', 'bottom'],
    activity: ['right'],
    gateway: ['top', 'right', 'bottom'],
  },
};

const CATEGORY_LABEL: Record<Category, string> = {
  event: 'an event',
  gateway: 'a gateway',
  activity: 'an activity',
};

/** Left ↔ right, top/bottom unchanged — the horizontal mirror applied to a return flow's policy. */
const MIRROR: Record<Side, Side> = { left: 'right', right: 'left', top: 'top', bottom: 'bottom' };
const mirrorSides = (sides: Side[]): Side[] => sides.map((side) => MIRROR[side]);

/** The category whose side policy applies, or `null` for shapes the rule leaves alone. */
function categoryOf(el: ModdleElement): Category | null {
  if (inst(el, 'bpmn:BoundaryEvent')) {
    return null; // sits on its host's border — any side is legitimate
  }
  if (inst(el, 'bpmn:Event')) {
    return 'event';
  }
  if (inst(el, 'bpmn:Gateway')) {
    return 'gateway';
  }
  if (inst(el, 'bpmn:Activity')) {
    return 'activity';
  }
  return null;
}

const orList = (sides: Side[]): string =>
  sides.length <= 1 ? (sides[0] ?? '') : `${sides.slice(0, -1).join(', ')} or ${sides.at(-1)}`;

function wrongSideMessage(
  direction: Direction,
  id: string,
  side: Side,
  category: Category,
  allowed: Side[],
): string {
  return direction === 'incoming'
    ? `Sequence flow enters <${id}> from the ${side}; ${CATEGORY_LABEL[category]} must be entered from the ${orList(allowed)}`
    : `Sequence flow leaves <${id}> to the ${side}; ${CATEGORY_LABEL[category]} must exit to the ${orList(allowed)}`;
}

export default function flowConnectionSide(config?: FlowConnectionSideConfig): Rule {
  const { allowBackwardsFlow = true } = config ?? {};

  /**
   * Judge one endpoint of a flow — its `outgoing` end at the source, or its `incoming` end at the
   * target. Which side does `point` dock onto `ref`, and is that side allowed for `ref`'s category
   * in `direction`? For a `backward` (return) flow the allowed sides are mirrored left ↔ right.
   * Reports on `flowId` when the docking side is not allowed.
   */
  function evaluateEndpoint(
    reporter: Reporter,
    boundsById: Map<string, Rect>,
    flowId: string,
    direction: Direction,
    backward: boolean,
    ref: ModdleElement,
    point: Point | undefined,
  ): void {
    if (!ref || !point) {
      return;
    }

    const bounds = boundsById.get(ref.id);
    const category = categoryOf(ref);
    if (!bounds || !category) {
      return;
    }

    const policy = POLICY[direction][category];
    const allowed = backward ? mirrorSides(policy) : policy;

    // A gateway is a diamond: only its four tips are clean anchors, everything else is "seitlich".
    if (category === 'gateway') {
      const tipSide = gatewayTipSide(point, bounds);
      if (tipSide === null) {
        reporter.report(
          flowId,
          `Sequence flow connects to <${ref.id}> on a diagonal; a gateway must connect at one of its four tips`,
        );
        return;
      }
      if (!allowed.includes(tipSide)) {
        reporter.report(flowId, wrongSideMessage(direction, ref.id, tipSide, 'gateway', allowed));
      }
      return;
    }

    const side = attachSide(point, bounds);
    if (side === null) {
      return; // ambiguous docking (corner / off the border) — skip rather than guess
    }
    if (!allowed.includes(side)) {
      reporter.report(flowId, wrongSideMessage(direction, ref.id, side, category, allowed));
    }
  }

  /**
   * Does this flow read right-to-left — a return / loop-back edge whose target sits clearly left of
   * its source? Needs the DI bounds of both ends; a missing end (or `allowBackwardsFlow: false`)
   * counts as not backward, so the flow keeps the strict left-to-right policy.
   */
  function isReturnFlow(
    boundsById: Map<string, Rect>,
    source: ModdleElement,
    target: ModdleElement,
  ): boolean {
    if (!allowBackwardsFlow || !source || !target) {
      return false;
    }
    const sourceBounds = boundsById.get(source.id);
    const targetBounds = boundsById.get(target.id);
    return !!sourceBounds && !!targetBounds && isBackwardFlow(sourceBounds, targetBounds);
  }

  function check(node: ModdleElement, reporter: Reporter): void {
    if (node.$type !== 'bpmn:Definitions') {
      return;
    }

    for (const plane of collectByPlane(node)) {
      const boundsById = new Map<string, Rect>();
      for (const shape of plane.shapes) {
        boundsById.set(shape.el.id, shape.bounds);
      }

      const flows = plane.edges.filter((edge) => edge.el.$type === 'bpmn:SequenceFlow');

      for (const flow of flows) {
        const source = flow.el.sourceRef;
        const target = flow.el.targetRef;
        const backward = isReturnFlow(boundsById, source, target);

        evaluateEndpoint(
          reporter,
          boundsById,
          flow.el.id,
          'outgoing',
          backward,
          source,
          flow.waypoints[0],
        );
        evaluateEndpoint(
          reporter,
          boundsById,
          flow.el.id,
          'incoming',
          backward,
          target,
          flow.waypoints.at(-1),
        );
      }
    }
  }

  return { check };
}
