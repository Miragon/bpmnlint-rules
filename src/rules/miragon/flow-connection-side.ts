import { inst, PlaneRule } from '../../lib/di';
import type { DiagramPlane } from '../../lib/di';
import { attachSide, gatewayTipSide, isBackwardFlow, stubLength } from '../../lib/geometry';
import type { Point, Side } from '../../lib/geometry';
import type { ModdleElement, Reporter } from '../../lib/moddle';
import { defineRule } from '../../lib/utils/defineRule';

export interface FlowConnectionSideConfig {
  allowBackwardsFlow?: boolean;
  minStubLength?: number;
}

type Category = 'event' | 'gateway' | 'activity';
type Direction = 'incoming' | 'outgoing';

/** One end of a flow: `point` is the waypoint docked onto `ref`, `neighbor` the adjacent one. */
interface Endpoint {
  direction: Direction;
  ref: ModdleElement;
  point: Point | undefined;
  neighbor: Point | undefined;
}

/** What picks the policy for both ends of one flow. */
interface Route {
  flowId: string;
  backward: boolean;
  sourceIsChainMember: boolean;
}

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

/**
 * Reports a sequence flow that docks at the wrong side — an event entered from the top, an activity
 * exited to the left, a gateway connected on a diagonal flank instead of one of its four tips.
 *
 * Only DI coordinates decide: a flow's first waypoint is its exit off the source, its last waypoint
 * the entry into the target; the side each sits on is checked against {@link POLICY}. Scoped per
 * BPMNPlane; uncategorised shapes (data objects, pools, lanes) and boundary events are left alone.
 *
 * A **return flow** — target drawn clearly left of its source (see {@link isBackwardFlow}) — is a
 * legitimate right-to-left loop-back, so its policy is mirrored;
 * {@link FlowConnectionSide.allowedSidesFor} spells out how per endpoint.
 *
 * Each endpoint must also leave/enter with a **stub**: the first segment runs at least
 * `minStubLength` px straight out of the docked side before turning, so an edge cannot dock and
 * immediately bend away. Boundary events are skipped here too.
 *
 * Config (optional): `["error", { "allowBackwardsFlow": true, "minStubLength": 20 }]`.
 * `allowBackwardsFlow` (default `true`) mirrors return flows; `false` holds every flow to the strict
 * left-to-right policy. `minStubLength` (default `20`); `0` switches the stub check off.
 */
class FlowConnectionSide extends PlaneRule {
  private readonly allowBackwardsFlow: boolean;
  private readonly minStubLength: number;

  constructor(config?: FlowConnectionSideConfig) {
    super();
    const { allowBackwardsFlow = true, minStubLength = 20 } = config ?? {};
    this.allowBackwardsFlow = allowBackwardsFlow;
    this.minStubLength = minStubLength;
  }

  protected checkPlane(plane: DiagramPlane, reporter: Reporter): void {
    const returnTargets = this.returnTargetIds(plane);

    for (const flow of plane.sequenceFlows) {
      const source = flow.el.sourceRef;
      const target = flow.el.targetRef;
      const backward = this.isReturnFlow(plane, source, target);
      const route: Route = {
        flowId: flow.el.id,
        backward,
        sourceIsChainMember: backward && !!source && returnTargets.has(source.id),
      };

      this.checkEndpoint(plane, reporter, route, {
        direction: 'outgoing',
        ref: source,
        point: flow.waypoints[0],
        neighbor: flow.waypoints[1],
      });
      this.checkEndpoint(plane, reporter, route, {
        direction: 'incoming',
        ref: target,
        point: flow.waypoints.at(-1),
        neighbor: flow.waypoints.at(-2),
      });
    }
  }

  /**
   * Targets of return flows sit inside the return lane. A return flow whose source is one of them is
   * a "chain member" (exits mirrored); any other is an "initiator" (exits forward).
   */
  private returnTargetIds(plane: DiagramPlane): Set<string> {
    const returnTargets = new Set<string>();
    for (const flow of plane.sequenceFlows) {
      const target = flow.el.targetRef;
      if (target && this.isReturnFlow(plane, flow.el.sourceRef, target)) {
        returnTargets.add(target.id);
      }
    }
    return returnTargets;
  }

  /**
   * Right-to-left loop-back — target drawn clearly left of its source. A missing end or
   * `allowBackwardsFlow: false` counts as not backward, keeping the strict policy.
   */
  private isReturnFlow(plane: DiagramPlane, source: ModdleElement, target: ModdleElement): boolean {
    if (!this.allowBackwardsFlow || !source || !target) {
      return false;
    }
    const sourceBounds = plane.boundsOf(source.id);
    const targetBounds = plane.boundsOf(target.id);
    return !!sourceBounds && !!targetBounds && isBackwardFlow(sourceBounds, targetBounds);
  }

  /**
   * Checks the side `endpoint.point` docks onto against {@link allowedSidesFor}, then — if the side
   * is clean — that its stub reaches `minStubLength`. Reports a wrong side or a too-short stub on
   * the route's flow.
   */
  private checkEndpoint(
    plane: DiagramPlane,
    reporter: Reporter,
    route: Route,
    { direction, ref, point, neighbor }: Endpoint,
  ): void {
    if (!ref || !point) {
      return;
    }

    const bounds = plane.boundsOf(ref.id);
    const category = this.categoryOf(ref);
    if (!bounds || !category) {
      return;
    }

    // Gateway: only its four tips are clean anchors. Other shapes dock on an edge; a corner or
    // off-border point is too ambiguous, so it is skipped rather than guessed.
    const side = category === 'gateway' ? gatewayTipSide(point, bounds) : attachSide(point, bounds);
    if (side === null) {
      if (category === 'gateway') {
        reporter.report(
          route.flowId,
          `Sequence flow connects to <${ref.id}> on a diagonal; a gateway must connect at one of its four tips`,
        );
      }
      return;
    }

    const allowed = this.allowedSidesFor(direction, category, route);
    if (!allowed.includes(side)) {
      reporter.report(
        route.flowId,
        this.wrongSideMessage(direction, ref.id, side, category, allowed),
      );
      return;
    }

    if (this.minStubLength > 0 && neighbor) {
      const stub = stubLength(point, neighbor, side);
      if (stub < this.minStubLength) {
        reporter.report(route.flowId, this.shortStubMessage(direction, ref.id, side, stub));
      }
    }
  }

  /**
   * Resolves the allowed docking sides for one endpoint, mirroring the policy on a return flow:
   * - incoming (target): mirrored — event/activity left → right.
   * - outgoing activity: mirrored only for a chain member (right → left); else strict right — the
   *   linear backbone stays strict.
   * - outgoing gateway/event: a branch point may leave any tip on a return flow (forward ∪ mirror).
   */
  private allowedSidesFor(direction: Direction, category: Category, route: Route): Side[] {
    const policy = POLICY[direction][category];
    const mirrored = policy.map((side) => MIRROR[side]);

    if (direction === 'incoming') {
      return route.backward ? mirrored : policy;
    }
    if (category === 'activity') {
      return route.sourceIsChainMember ? mirrored : policy;
    }
    return route.backward ? [...new Set([...policy, ...mirrored])] : policy;
  }

  /** The category whose side policy applies, or `null` for shapes the rule leaves alone. */
  private categoryOf(el: ModdleElement): Category | null {
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

  private wrongSideMessage(
    direction: Direction,
    id: string,
    side: Side,
    category: Category,
    allowed: Side[],
  ): string {
    const sides =
      allowed.length <= 1
        ? (allowed[0] ?? '')
        : `${allowed.slice(0, -1).join(', ')} or ${allowed.at(-1)}`;

    return direction === 'incoming'
      ? `Sequence flow enters <${id}> from the ${side}; ${CATEGORY_LABEL[category]} must be entered from the ${sides}`
      : `Sequence flow leaves <${id}> to the ${side}; ${CATEGORY_LABEL[category]} must exit to the ${sides}`;
  }

  private shortStubMessage(direction: Direction, id: string, side: Side, stub: number): string {
    const stubPx = Math.max(0, Math.round(stub));
    const min = this.minStubLength;

    return direction === 'incoming'
      ? `Sequence flow enters <${id}> from the ${side} with only a ${stubPx}px stub; it must run at least ${min}px straight in before turning`
      : `Sequence flow leaves <${id}> to the ${side} with only a ${stubPx}px stub; it must run at least ${min}px straight out before turning`;
  }
}

export default defineRule(
  { ruleName: 'flow-connection-side', kind: 'layout-hint' },
  FlowConnectionSide,
);
