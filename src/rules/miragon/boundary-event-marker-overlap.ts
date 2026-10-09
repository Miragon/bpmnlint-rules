import { markerZones } from '../../lib/activity-markers';
import { collectByPlane, inst } from '../../lib/di';
import { circleOverlapsRect } from '../../lib/geometry';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

const GRAZE_TOLERANCE = 3;

/**
 * Reports a boundary event drawn over a marker or icon of its host activity — the `+` of a call
 * activity or collapsed sub-process, a loop, multi-instance or ad-hoc marker, or the task type icon.
 *
 * Only zones the host actually renders count, so a boundary event at the bottom centre of a plain
 * task is left alone, and the event has to reach at least `GRAZE_TOLERANCE` px into a zone, so one
 * that merely grazes it is not reported. Comparison is scoped per BPMNPlane.
 */
export default function boundaryEventMarkerOverlap(): Rule {
  function check(node: ModdleElement, reporter: Reporter): void {
    if (node.$type !== 'bpmn:Definitions') {
      return;
    }

    for (const plane of collectByPlane(node)) {
      const shapesById = new Map(plane.shapes.map((shape) => [shape.el.id, shape]));
      const boundaryEvents = plane.shapes.filter((shape) => inst(shape.el, 'bpmn:BoundaryEvent'));

      for (const { el, bounds } of boundaryEvents) {
        const host = shapesById.get(el.attachedToRef?.id);

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

  return { check };
}

boundaryEventMarkerOverlap.ruleName = 'boundary-event-marker-overlap' as const;
