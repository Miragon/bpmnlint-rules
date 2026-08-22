import { collectByPlane } from '../../lib/di';
import { bendCount, isMonotonePath } from '../../lib/geometry';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

/**
 * Reports a sequence flow drawn as a meandering "Schlangenlinie": one that reverses on itself and
 * then keeps bending, instead of reaching its target directly.
 *
 * Only the DI coordinates decide, scoped per BPMNPlane. A flow that makes **monotone** progress
 * (never doubling back on either axis: a straight line, an L, a Z, or a staircase that steps toward
 * its target across rows or lanes) is always fine, however many bends it has (see
 * {@link isMonotonePath}). A flow that **reverses** direction is allowed a small budget of bends for
 * the wrap, since a legitimate loop-back has to turn around to reach an earlier element; beyond
 * {@link FlowZigzagConfig.maxWrapBends} bends the reversal has turned into a zigzag (see
 * {@link bendCount}).
 *
 * Slanted (diagonal) segments are `flow-orthogonal`'s concern, so this rule assumes orthogonal
 * routing and only judges directness. A flow onto its own element (a self-loop) is always a full
 * wrap, so it is left alone.
 *
 * Configuration (optional):
 *
 *     "miragon/flow-zigzag": [ "error", { "maxWrapBends": 3 } ]
 *
 * `maxWrapBends` (default `3`) is how many bends a flow that reverses direction may make before it
 * is reported: a clean loop-back wraps in two or three (down, across, up), so beyond that the route
 * is winding. Monotone flows are never judged by it. Raise it for diagrams where a flow must wrap
 * around several elements to get back.
 */

export interface FlowZigzagConfig {
  maxWrapBends?: number;
}

export default function flowZigzag(config?: FlowZigzagConfig): Rule {
  const { maxWrapBends = 3 } = config ?? {};

  function check(node: ModdleElement, reporter: Reporter): void {
    if (node.$type !== 'bpmn:Definitions') {
      return;
    }

    for (const plane of collectByPlane(node)) {
      const flows = plane.edges.filter((edge) => edge.el.$type === 'bpmn:SequenceFlow');

      for (const flow of flows) {
        const source = flow.el.sourceRef;
        const target = flow.el.targetRef;
        if (source && target && source.id === target.id) {
          continue; // a self-loop is always a full wrap: leave it alone
        }

        // A flow that never doubles back reads as steady progress, so its bend count does not
        // matter. Only a flow that reverses is held to the wrap budget.
        if (isMonotonePath(flow.waypoints)) {
          continue;
        }

        if (bendCount(flow.waypoints) > maxWrapBends) {
          reporter.report(
            flow.el.id,
            `Sequence flow <${flow.el.id}> winds back on itself instead of reaching its target directly; route it more directly`,
          );
        }
      }
    }
  }

  return { check };
}
