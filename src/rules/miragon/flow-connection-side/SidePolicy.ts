import { inst } from '../../../toolkit/diagram';
import type { Side } from '../../../toolkit/geometry';
import type { ModdleElement } from '../../../core/moddle';
import type { Category, Direction, Route } from './types';

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

/**
 * Left ↔ right, top/bottom unchanged — the horizontal mirror applied to a return flow's policy.
 */
const MIRROR: Record<Side, Side> = { left: 'right', right: 'left', top: 'top', bottom: 'bottom' };

/**
 * Which sides a flow may dock on, per endpoint, following {@link POLICY}.
 */
export class SidePolicy {
  /**
   * Resolves the allowed docking sides for one endpoint, mirroring the policy on a return flow:
   * - incoming (target): mirrored — event/activity left → right.
   * - outgoing activity: mirrored only for a chain member (right → left); else strict right — the
   *   linear backbone stays strict.
   * - outgoing gateway/event: a branch point may leave any tip on a return flow (forward ∪ mirror).
   */
  allowedSidesFor(direction: Direction, category: Category, route: Route): Side[] {
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

  /**
   * The category whose side policy applies, or `null` for shapes the rule leaves alone.
   */
  categoryOf(el: ModdleElement): Category | null {
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
}
