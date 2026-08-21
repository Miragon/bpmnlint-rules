import { collectByPlane, inst } from '../../lib/di';
import { attachSide, gatewayTipSide, isBackwardFlow, stubLength } from '../../lib/geometry';
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
 * {@link isBackwardFlow}) — is a legitimate right-to-left loop-back. Its **target** is always
 * entered on the mirrored (right) side, so a return flow re-entering the wrong/forward face is still
 * reported. Its **source** side, however, depends on the source's role in the return path:
 *
 * - an **initiator** (a forward-lane element that starts the loop-back — it is not itself the target
 *   of a return flow) exits on its normal *forward* side (an activity to the right) and wraps around;
 * - a **chain member** (already the target of a return flow, so it sits inside the return lane)
 *   exits on the *mirrored* side (an activity to the left), continuing the leftward chain.
 *
 * On top of the side, a flow must leave (and enter) with a **stub**: its first segment has to run at
 * least `minStubLength` px straight out of the docked side before it turns, so an edge cannot dock
 * and immediately bend away (which renders as an arrow leaving a corner with no visible direction).
 * The stub is measured along the docked side's outward normal, so it is the same check for an
 * activity, an event and a gateway tip; boundary events are left alone here too.
 *
 * Configuration (optional):
 *
 *     "miragon/flow-connection-side": [ "error", { "allowBackwardsFlow": false, "minStubLength": 20 } ]
 *
 * `allowBackwardsFlow` defaults to `true` (return flows are mirrored, as above). Set it to `false`
 * to hold every flow to the strict left-to-right policy, so a return flow's docking is reported like
 * any other wrong-side connection. `minStubLength` defaults to `20`; set it to `0` to switch the
 * stub check off.
 */

export interface FlowConnectionSideConfig {
  allowBackwardsFlow?: boolean;
  minStubLength?: number;
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

function shortStubMessage(
  direction: Direction,
  id: string,
  side: Side,
  stub: number,
  min: number,
): string {
  const stubPx = Math.max(0, Math.round(stub));
  return direction === 'incoming'
    ? `Sequence flow enters <${id}> from the ${side} with only a ${stubPx}px stub; it must run at least ${min}px straight in before turning`
    : `Sequence flow leaves <${id}> to the ${side} with only a ${stubPx}px stub; it must run at least ${min}px straight out before turning`;
}

export default function flowConnectionSide(config?: FlowConnectionSideConfig): Rule {
  const { allowBackwardsFlow = true, minStubLength = 20 } = config ?? {};

  /**
   * Judge one endpoint of a flow — its `outgoing` end at the source, or its `incoming` end at the
   * target. `point` is the waypoint docked onto `ref`, `neighbor` the adjacent waypoint. First:
   * which side does `point` dock onto, and is that side allowed for `ref`'s category in `direction`?
   * When `mirror` is set the allowed sides are mirrored left ↔ right (a return flow's target, and a
   * return flow's source when it is a chain member). Then, if the side is clean, the docking stub
   * (how far the edge runs straight out of that side before turning) must reach `minStubLength`.
   * Reports on `flowId` for a wrong docking side or a too-short stub.
   */
  function evaluateEndpoint(
    reporter: Reporter,
    boundsById: Map<string, Rect>,
    flowId: string,
    direction: Direction,
    mirror: boolean,
    ref: ModdleElement,
    point: Point | undefined,
    neighbor: Point | undefined,
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
    const allowed = mirror ? mirrorSides(policy) : policy;

    // A gateway is a diamond: only its four tips are clean anchors, everything else is "seitlich".
    // Other shapes dock on one of their four edges; a corner / off-border point is too ambiguous to
    // judge, so it is skipped rather than guessed.
    const side = category === 'gateway' ? gatewayTipSide(point, bounds) : attachSide(point, bounds);
    if (side === null) {
      if (category === 'gateway') {
        reporter.report(
          flowId,
          `Sequence flow connects to <${ref.id}> on a diagonal; a gateway must connect at one of its four tips`,
        );
      }
      return;
    }

    if (!allowed.includes(side)) {
      reporter.report(flowId, wrongSideMessage(direction, ref.id, side, category, allowed));
      return;
    }

    // The side is clean — now the edge must leave/enter with a stub, not dock and immediately turn.
    if (minStubLength > 0 && neighbor) {
      const stub = stubLength(point, neighbor, side);
      if (stub < minStubLength) {
        reporter.report(flowId, shortStubMessage(direction, ref.id, side, stub, minStubLength));
      }
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

      // Every element that is the target of a return flow sits inside the return lane. A return
      // flow whose source is one of them is a "chain member" (exits mirrored); any other return
      // flow's source is an "initiator" that starts the loop-back (exits its forward side).
      const returnTargets = new Set<string>();
      for (const flow of flows) {
        const source = flow.el.sourceRef;
        const target = flow.el.targetRef;
        if (target && isReturnFlow(boundsById, source, target)) {
          returnTargets.add(target.id);
        }
      }

      for (const flow of flows) {
        const source = flow.el.sourceRef;
        const target = flow.el.targetRef;
        const backward = isReturnFlow(boundsById, source, target);
        const sourceIsChainMember = backward && !!source && returnTargets.has(source.id);

        evaluateEndpoint(
          reporter,
          boundsById,
          flow.el.id,
          'outgoing',
          sourceIsChainMember,
          source,
          flow.waypoints[0],
          flow.waypoints[1],
        );
        evaluateEndpoint(
          reporter,
          boundsById,
          flow.el.id,
          'incoming',
          backward,
          target,
          flow.waypoints.at(-1),
          flow.waypoints.at(-2),
        );
      }
    }
  }

  return { check };
}
