import { collectByPlane, inst } from '../../lib/di';
import type { PlaneShape } from '../../lib/di';
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
 * An **expanded sub-process** is measured against its inner reading line, not its box centre: the
 * container's height is set by its contents and the flow docks at the inner main row (near the top),
 * so the box centre lands in arbitrary empty space. The centre of its single inner `bpmn:StartEvent`
 * is used instead (see {@link readingLineRect}). A collapsed sub-process is a task-sized box, so its
 * box centre is the reading line and the default applies.
 *
 * Configuration (optional):
 *
 *     "miragon/flow-target-alignment": [ "error", {
 *       "exemptTypes": ["bpmn:Gateway", "bpmn:BoundaryEvent", "bpmn:SubProcess"]
 *     } ]
 *
 * `exemptTypes` replaces the default `["bpmn:Gateway", "bpmn:BoundaryEvent"]`. It stays as an escape
 * hatch (add `bpmn:SubProcess` to drop the check for sub-processes entirely), but is no longer needed
 * for the expanded-sub-process false positive — that is now measured correctly.
 */
export default function flowTargetAlignment(config?: FlowTargetAlignmentConfig): Rule {
  const { exemptTypes = DEFAULT_EXEMPT_TYPES } = config ?? {};

  const isExempt = (el: ModdleElement): boolean => exemptTypes.some((type) => inst(el, type));

  /**
   * The bounds of an expanded sub-process's **single inner start event** — the row its flows
   * actually dock at, since the box centre sits in the empty space its contents create. `null` when
   * there is no single inner start event with DI: none or several is a modelling smell owned by
   * other rules (`start-event-required` / `sub-process-blank-start-event`), so this rule stays quiet
   * rather than measure a row it cannot trust.
   */
  function innerStartEventBounds(
    subProcess: ModdleElement,
    boundsOf: (id: string) => Rect | undefined,
  ): Rect | null {
    const starts = (subProcess.flowElements ?? []).filter((child: ModdleElement) =>
      inst(child, 'bpmn:StartEvent'),
    );
    if (starts.length !== 1) {
      return null;
    }
    return boundsOf(starts[0].id) ?? null;
  }

  /**
   * The rectangle whose vertical centre is the row an endpoint reads on: for an expanded sub-process
   * the bounds of its inner start event (see {@link innerStartEventBounds}); for everything else
   * (tasks, events, collapsed sub-processes) the shape's own box. `null` means the flow must be
   * skipped without firing — an expanded sub-process without a single inner start event has no row to
   * measure.
   */
  function readingLineRect(
    el: ModdleElement,
    shape: PlaneShape,
    boundsOf: (id: string) => Rect | undefined,
  ): Rect | null {
    if (inst(el, 'bpmn:SubProcess') && shape.isExpanded) {
      return innerStartEventBounds(el, boundsOf);
    }
    return shape.bounds;
  }

  function check(node: ModdleElement, reporter: Reporter): void {
    if (node.$type !== 'bpmn:Definitions') {
      return;
    }

    for (const plane of collectByPlane(node)) {
      const shapeById = new Map<string, PlaneShape>();
      for (const shape of plane.shapes) {
        shapeById.set(shape.el.id, shape);
      }
      const boundsOf = (id: string): Rect | undefined => shapeById.get(id)?.bounds;

      const flows = plane.edges.filter((edge) => edge.el.$type === 'bpmn:SequenceFlow');

      for (const flow of flows) {
        const source = flow.el.sourceRef;
        const target = flow.el.targetRef;
        if (!source || !target || isExempt(source) || isExempt(target)) {
          continue;
        }

        const sourceShape = shapeById.get(source.id);
        const targetShape = shapeById.get(target.id);
        if (!sourceShape || !targetShape) {
          continue; // no DI for one end — nothing to compare, skip rather than guess
        }

        const sourceRect = readingLineRect(source, sourceShape, boundsOf);
        const targetRect = readingLineRect(target, targetShape, boundsOf);
        if (!sourceRect || !targetRect) {
          continue; // expanded sub-process without a single inner start event — don't fire
        }

        if (!sameRow(sourceRect, targetRect)) {
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
