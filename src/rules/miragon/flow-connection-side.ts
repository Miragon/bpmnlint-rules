import { collectByPlane, inst } from '../../lib/di';
import { attachSide, gatewayTipSide, isBackwardFlow, stubLength } from '../../lib/geometry';
import type { Point, Rect, Side } from '../../lib/geometry';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

/**
 * Reports a sequence flow that docks at the wrong side — an event entered from the top, an activity
 * exited to the left, a gateway connected on a diagonal flank instead of one of its four tips.
 *
 * Only DI coordinates decide: a flow's first waypoint is its exit off the source, its last waypoint
 * the entry into the target; the side each sits on is checked against {@link POLICY}. Scoped per
 * BPMNPlane; uncategorised shapes (data objects, pools, lanes) and boundary events are left alone.
 *
 * A **return flow** — target drawn clearly left of its source (see {@link isBackwardFlow}) — is a
 * legitimate right-to-left loop-back, so its policy is mirrored; {@link allowedSidesFor} spells out
 * how per endpoint.
 *
 * Each endpoint must also leave/enter with a **stub**: the first segment runs at least
 * `minStubLength` px straight out of the docked side before turning, so an edge cannot dock and
 * immediately bend away. Boundary events are skipped here too.
 *
 * Config (optional): `["error", { "allowBackwardsFlow": true, "minStubLength": 20 }]`.
 * `allowBackwardsFlow` (default `true`) mirrors return flows; `false` holds every flow to the strict
 * left-to-right policy. `minStubLength` (default `20`); `0` switches the stub check off.
 */

export interface FlowConnectionSideConfig {
  allowBackwardsFlow?: boolean;
  minStubLength?: number;
}

type Category = 'event' | 'gateway' | 'activity';
type Direction = 'incoming' | 'outgoing';

/**
 * Allowed docking sides per direction and category — the single knob for what counts as clean.
 * `incoming` is a flow's target end, `outgoing` its source. Left-to-right model: the main flow enters
 * on the left; activities exit right; events and gateways branch out any side but the incoming-left
 * one. A gateway is entered at any tip but the forward-right one (mirror of that exit rule), and only
 * ever connects at one of its four tips.
 */
const POLICY: Record<Direction, Record<Category, Side[]>> = {
  incoming: {
    event: ['left'],
    activity: ['left'],
    gateway: ['top', 'bottom', 'left'],
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

/** De-duplicated union of two side lists. */
const union = (first: Side[], second: Side[]): Side[] => [...new Set([...first, ...second])];

/**
 * Resolves the allowed docking sides for one endpoint, mirroring the policy on a return flow:
 * - incoming (target): mirrored — event/activity left → right.
 * - outgoing activity: mirrored only for a chain member (right → left); else strict right — the
 *   linear backbone stays strict.
 * - outgoing gateway/event: a branch point may leave any tip on a return flow (forward ∪ mirror).
 */
function allowedSidesFor(
  direction: Direction,
  category: Category,
  backward: boolean,
  sourceIsChainMember: boolean,
): Side[] {
  const policy = POLICY[direction][category];
  if (direction === 'incoming') {
    return backward ? mirrorSides(policy) : policy;
  }
  if (category === 'activity') {
    return sourceIsChainMember ? mirrorSides(policy) : policy;
  }
  // gateway or event: a branch point may leave any tip on a return flow.
  return backward ? union(policy, mirrorSides(policy)) : policy;
}

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
   * Judge one endpoint — the outgoing end at the source or the incoming end at the target. `point`
   * is the waypoint docked onto `ref`, `neighbor` the adjacent one. Checks the side `point` docks
   * onto against {@link allowedSidesFor} (`backward` / `sourceIsChainMember` pick the policy), then —
   * if the side is clean — that its stub reaches `minStubLength`. Reports a wrong side or a too-short
   * stub on `flowId`.
   */
  function evaluateEndpoint(
    reporter: Reporter,
    boundsById: Map<string, Rect>,
    flowId: string,
    direction: Direction,
    backward: boolean,
    sourceIsChainMember: boolean,
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

    const allowed = allowedSidesFor(direction, category, backward, sourceIsChainMember);

    // Gateway: only its four tips are clean anchors. Other shapes dock on an edge; a corner or
    // off-border point is too ambiguous, so it is skipped rather than guessed.
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
   * Right-to-left loop-back — target drawn clearly left of its source. A missing end or
   * `allowBackwardsFlow: false` counts as not backward, keeping the strict policy.
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

      // Targets of return flows sit inside the return lane. A return flow whose source is one of
      // them is a "chain member" (exits mirrored); any other is an "initiator" (exits forward).
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
          backward,
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
          sourceIsChainMember,
          target,
          flow.waypoints.at(-1),
          flow.waypoints.at(-2),
        );
      }
    }
  }

  return { check };
}
