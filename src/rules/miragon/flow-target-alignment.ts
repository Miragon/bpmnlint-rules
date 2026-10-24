import { inst, PlaneRule } from '../../lib/di';
import type { DiagramPlane } from '../../lib/di';
import { sameRow } from '../../lib/geometry';
import type { Rect } from '../../lib/geometry';
import type { ModdleElement, Reporter } from '../../lib/moddle';
import { defineRule } from '../../lib/utils/defineRule';

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
 * is used instead (see {@link FlowTargetAlignment.readingLineRect}). A collapsed sub-process is a
 * task-sized box, so its box centre is the reading line and the default applies.
 *
 * Configuration (optional):
 *
 *     "@miragon/rules/flow-target-alignment": [ "error", {
 *       "exemptTypes": ["bpmn:Gateway", "bpmn:BoundaryEvent", "bpmn:SubProcess"]
 *     } ]
 *
 * `exemptTypes` replaces the default `["bpmn:Gateway", "bpmn:BoundaryEvent"]`. It stays as an escape
 * hatch (add `bpmn:SubProcess` to drop the check for sub-processes entirely), but is no longer needed
 * for the expanded-sub-process false positive — that is now measured correctly.
 */
class FlowTargetAlignment extends PlaneRule {
  private readonly exemptTypes: string[];

  constructor(config?: FlowTargetAlignmentConfig) {
    super();
    this.exemptTypes = config?.exemptTypes ?? DEFAULT_EXEMPT_TYPES;
  }

  protected checkPlane(plane: DiagramPlane, reporter: Reporter): void {
    for (const flow of plane.sequenceFlows) {
      const source = flow.el.sourceRef;
      const target = flow.el.targetRef;
      if (!source || !target || this.isExempt(source) || this.isExempt(target)) {
        continue;
      }

      const sourceRect = this.readingLineRect(source, plane);
      const targetRect = this.readingLineRect(target, plane);
      if (!sourceRect || !targetRect) {
        continue;
      }

      if (!sameRow(sourceRect, targetRect)) {
        reporter.report(
          flow.el.id,
          `Sequence flow connects <${source.id}> to <${target.id}> at a different height; an outgoing flow's target should sit at the same height as its source`,
        );
      }
    }
  }

  private isExempt(el: ModdleElement): boolean {
    return this.exemptTypes.some((type) => inst(el, type));
  }

  /**
   * The rectangle whose vertical centre is the row an endpoint reads on: for an expanded
   * sub-process the bounds of its inner start event (see {@link innerStartEventBounds}); for
   * everything else (tasks, events, collapsed sub-processes) the shape's own box. `null` means the
   * flow must be skipped without firing — the endpoint has no DI on this plane, or is an expanded
   * sub-process without a single inner start event, so there is no row to measure.
   */
  private readingLineRect(el: ModdleElement, plane: DiagramPlane): Rect | null {
    const shape = plane.shapeOf(el.id);
    if (!shape) {
      return null;
    }
    if (inst(el, 'bpmn:SubProcess') && shape.isExpanded) {
      return this.innerStartEventBounds(el, plane);
    }
    return shape.bounds;
  }

  /**
   * The bounds of an expanded sub-process's **single inner start event** — the row its flows
   * actually dock at, since the box centre sits in the empty space its contents create. `null` when
   * there is no single inner start event with DI: none or several is a modelling smell owned by
   * other rules (`start-event-required` / `sub-process-blank-start-event`), so this rule stays quiet
   * rather than measure a row it cannot trust.
   */
  private innerStartEventBounds(subProcess: ModdleElement, plane: DiagramPlane): Rect | null {
    const starts = (subProcess.flowElements ?? []).filter((child: ModdleElement) =>
      inst(child, 'bpmn:StartEvent'),
    );
    if (starts.length !== 1) {
      return null;
    }
    return plane.boundsOf(starts[0].id) ?? null;
  }
}

export default defineRule(
  { ruleName: 'flow-target-alignment', kind: 'layout-hint' },
  FlowTargetAlignment,
);
