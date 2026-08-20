import { collectByPlane, inst } from '../../lib/di';
import { sameRow } from '../../lib/geometry';
import type { Rect } from '../../lib/geometry';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

/**
 * Reports an outgoing sequence flow whose target is drawn at a different height than its source, so
 * the main path slopes up or down instead of reading as a straight horizontal line.
 *
 * Only the DI coordinates decide: the vertical centre of the source shape is compared against the
 * vertical centre of the target shape (see {@link sameRow}), scoped per BPMNPlane. Gateways are
 * exempt on either end — they legitimately branch up and down — and so are boundary events, which
 * sit on their host's border and drop to a handler placed below.
 */

/**
 * Shapes whose flows legitimately change height, so this rule leaves any flow touching one alone:
 * a **gateway** branches its paths up and down, and a **boundary event** sits on its host's border
 * and drops to a handler underneath.
 */
function isExempt(el: ModdleElement): boolean {
  return inst(el, 'bpmn:Gateway') || inst(el, 'bpmn:BoundaryEvent');
}

export default function flowTargetAlignment(): Rule {
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
        if (!source || !target || isExempt(source) || isExempt(target)) {
          continue;
        }

        const sourceBounds = boundsById.get(source.id);
        const targetBounds = boundsById.get(target.id);
        if (!sourceBounds || !targetBounds) {
          continue; // no DI for one end — nothing to compare, skip rather than guess
        }

        if (!sameRow(sourceBounds, targetBounds)) {
          reporter.report(
            flow.el.id,
            `Sequence flow connects <${source.id}> to <${target.id}> at a different height; an outgoing flow's target should sit at the same height as its source`,
          );
        }
      }
    }
  }

  return { check };
}
