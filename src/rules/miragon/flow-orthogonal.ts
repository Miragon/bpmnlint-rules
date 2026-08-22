import { collectByPlane } from '../../lib/di';
import { isOrthogonalPath } from '../../lib/geometry';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

/**
 * Reports a sequence flow drawn on a slant: one with a segment that runs diagonally instead of
 * horizontally or vertically.
 *
 * Only the DI coordinates decide, scoped per BPMNPlane. BPMN sequence flows are routed
 * orthogonally, so any flow with a slanted segment (see {@link isOrthogonalPath}) is reported,
 * including a single straight diagonal between two shapes. That overlaps on purpose with
 * `flow-target-alignment`, which reports the misaligned shapes behind such a diagonal: the two
 * suggest different fixes (align the shapes, or route the flow orthogonally), so both are useful.
 */
export default function flowOrthogonal(): Rule {
  function check(node: ModdleElement, reporter: Reporter): void {
    if (node.$type !== 'bpmn:Definitions') {
      return;
    }

    for (const plane of collectByPlane(node)) {
      const flows = plane.edges.filter((edge) => edge.el.$type === 'bpmn:SequenceFlow');

      for (const flow of flows) {
        if (!isOrthogonalPath(flow.waypoints)) {
          reporter.report(
            flow.el.id,
            `Sequence flow <${flow.el.id}> runs diagonally; use only horizontal and vertical segments`,
          );
        }
      }
    }
  }

  return { check };
}
