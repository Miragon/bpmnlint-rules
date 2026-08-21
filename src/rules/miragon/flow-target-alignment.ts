import { collectByPlane, inst } from '../../lib/di';
import { sameRow } from '../../lib/geometry';
import type { Rect } from '../../lib/geometry';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

export interface FlowTargetAlignmentConfig {
  /**
   * BPMN types whose flows are never judged. Given a value, it **replaces** the default list
   * entirely — so keep the defaults you still want.
   */
  exemptTypes?: string[];
}

/**
 * Element types whose flows legitimately change height, so the rule leaves any flow touching one
 * alone: a **gateway** branches its paths up and down, and a **boundary event** sits on its host's
 * border and drops to a handler underneath. Matched with {@link inst}, so subtypes are covered too.
 */
const DEFAULT_EXEMPT_TYPES = ['bpmn:Gateway', 'bpmn:BoundaryEvent'];

/**
 * Reports an outgoing sequence flow whose target is drawn at a different height than its source, so
 * the main path slopes up or down instead of reading as a straight horizontal line.
 *
 * Only the DI coordinates decide: the vertical centre of the source shape is compared against the
 * vertical centre of the target shape (see {@link sameRow}), scoped per BPMNPlane. Flows touching an
 * exempt element type are left alone — gateways (which legitimately branch up and down) and boundary
 * events (which drop to a handler below) by default.
 *
 * Configuration (optional):
 *
 *     "miragon/flow-target-alignment": [ "error", {
 *       "exemptTypes": ["bpmn:Gateway", "bpmn:BoundaryEvent", "bpmn:SubProcess"]
 *     } ]
 *
 * `exemptTypes` replaces the default `["bpmn:Gateway", "bpmn:BoundaryEvent"]`. Add `bpmn:SubProcess`
 * to silence the false positives an expanded sub-process produces: its bounding-box centre is not
 * where the flow attaches (the edge docks at the inner main row near the top), so a perfectly
 * horizontal flow would otherwise be reported.
 */
export default function flowTargetAlignment(config?: FlowTargetAlignmentConfig): Rule {
  const { exemptTypes = DEFAULT_EXEMPT_TYPES } = config ?? {};

  const isExempt = (el: ModdleElement): boolean => exemptTypes.some((type) => inst(el, type));

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
