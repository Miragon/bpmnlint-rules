import { PlaneRule } from '../../../toolkit/diagram';
import type { DiagramPlane } from '../../../toolkit/diagram';
import { attachSide, gatewayTipSide, stubLength } from '../../../toolkit/geometry';
import type { Reporter } from '../../../core/moddle';
import { defineRule } from '../../../core/utils/defineRule';
import { ConnectionSideMessages } from './ConnectionSideMessages';
import { ReturnFlows } from './ReturnFlows';
import { SidePolicy } from './SidePolicy';
import type { Endpoint, Route } from './types';

export interface FlowConnectionSideConfig {
  allowBackwardsFlow?: boolean;
  minStubLength?: number;
}

/**
 * Reports a sequence flow that docks at the wrong side — an event entered from the top, an activity
 * exited to the left, a gateway connected on a diagonal flank instead of one of its four tips.
 *
 * Only DI coordinates decide: a flow's first waypoint is its exit off the source, its last waypoint
 * the entry into the target; the side each sits on is checked against the {@link SidePolicy}. Scoped
 * per BPMNPlane; uncategorised shapes (data objects, pools, lanes) and boundary events are left alone.
 *
 * A **return flow** — target drawn clearly left of its source (see {@link ReturnFlows}) — is a
 * legitimate right-to-left loop-back, so its policy is mirrored;
 * {@link SidePolicy.allowedSidesFor} spells out how per endpoint.
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
  private readonly sidePolicy = new SidePolicy();
  private readonly messages: ConnectionSideMessages;

  constructor(config?: FlowConnectionSideConfig) {
    super();
    const { allowBackwardsFlow = true, minStubLength = 20 } = config ?? {};
    this.allowBackwardsFlow = allowBackwardsFlow;
    this.minStubLength = minStubLength;
    this.messages = new ConnectionSideMessages(minStubLength);
  }

  protected checkPlane(plane: DiagramPlane, reporter: Reporter): void {
    const returnFlows = new ReturnFlows(plane, this.allowBackwardsFlow);

    for (const flow of plane.sequenceFlows) {
      const source = flow.el.sourceRef;
      const target = flow.el.targetRef;
      const backward = returnFlows.isReturnFlow(source, target);
      const route: Route = {
        flowId: flow.el.id,
        backward,
        sourceIsChainMember: backward && returnFlows.isChainMember(source),
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
   * Checks the side `endpoint.point` docks onto against {@link SidePolicy.allowedSidesFor}, then — if
   * the side is clean — that its stub reaches `minStubLength`. Reports a wrong side or a too-short
   * stub on the route's flow.
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
    const category = this.sidePolicy.categoryOf(ref);
    if (!bounds || !category) {
      return;
    }

    // Gateway: only its four tips are clean anchors. Other shapes dock on an edge; a corner or
    // off-border point is too ambiguous, so it is skipped rather than guessed.
    const side = category === 'gateway' ? gatewayTipSide(point, bounds) : attachSide(point, bounds);
    if (side === null) {
      if (category === 'gateway') {
        reporter.report(route.flowId, this.messages.diagonalGateway(ref.id));
      }
      return;
    }

    const allowed = this.sidePolicy.allowedSidesFor(direction, category, route);
    if (!allowed.includes(side)) {
      reporter.report(
        route.flowId,
        this.messages.wrongSide(direction, ref.id, side, category, allowed),
      );
      return;
    }

    if (this.minStubLength > 0 && neighbor) {
      const stub = stubLength(point, neighbor, side);
      if (stub < this.minStubLength) {
        reporter.report(route.flowId, this.messages.shortStub(direction, ref.id, side, stub));
      }
    }
  }
}

export default defineRule(
  { ruleName: 'flow-connection-side', kind: 'layout-hint' },
  FlowConnectionSide,
);
