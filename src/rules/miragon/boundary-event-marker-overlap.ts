import { inst, markerZones, PlaneRule } from '../../lib/di';
import type { DiagramPlane } from '../../lib/di';
import { circleOverlapsRect } from '../../lib/geometry';
import type { Reporter } from '../../lib/moddle';
import { defineRule } from '../../lib/utils/defineRule';

const GRAZE_TOLERANCE = 3;

/**
 * Reports a boundary event drawn over a marker or icon of its host activity — the `+` of a call
 * activity or collapsed sub-process, a loop, multi-instance or ad-hoc marker, or the task type icon.
 *
 * Only zones the host actually renders count, so a boundary event at the bottom centre of a plain
 * task is left alone, and the event has to reach at least `GRAZE_TOLERANCE` px into a zone, so one
 * that merely grazes it is not reported. Comparison is scoped per BPMNPlane.
 */
class BoundaryEventMarkerOverlap extends PlaneRule {
  protected checkPlane(plane: DiagramPlane, reporter: Reporter): void {
    const boundaryEvents = plane.shapes.filter((shape) => inst(shape.el, 'bpmn:BoundaryEvent'));

    for (const { el, bounds } of boundaryEvents) {
      const host = plane.shapeOf(el.attachedToRef?.id);

      if (!host) {
        continue;
      }

      const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      const coveringRadius = bounds.width / 2 - GRAZE_TOLERANCE;

      for (const { label, zone } of markerZones(host)) {
        if (circleOverlapsRect(center, coveringRadius, zone)) {
          reporter.report(
            el.id,
            `Boundary event covers the ${label} of <${host.el.id}>; move it along the border`,
          );
        }
      }
    }
  }
}

export default defineRule(
  { ruleName: 'boundary-event-marker-overlap', kind: 'layout-hint' },
  BoundaryEventMarkerOverlap,
);
