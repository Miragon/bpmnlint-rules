import { PlaneRule } from '../../lib/di';
import type { DiagramPlane } from '../../lib/di';
import { isOrthogonalPath } from '../../lib/geometry';
import type { Reporter } from '../../lib/moddle';
import { defineRule } from '../../lib/utils/defineRule';

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
class FlowOrthogonal extends PlaneRule {
  protected checkPlane(plane: DiagramPlane, reporter: Reporter): void {
    for (const flow of plane.sequenceFlows) {
      if (!isOrthogonalPath(flow.waypoints)) {
        reporter.report(
          flow.el.id,
          `Sequence flow <${flow.el.id}> runs diagonally; use only horizontal and vertical segments`,
        );
      }
    }
  }
}

export default defineRule({ ruleName: 'flow-orthogonal', kind: 'layout-hint' }, FlowOrthogonal);
