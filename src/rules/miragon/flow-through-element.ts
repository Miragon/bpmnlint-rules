import { collectByPlane, flowEndpointIds, inst, isPassableShape } from '../../lib/di';
import {
  bboxDisjoint,
  bboxOfPoints,
  bboxOfRect,
  segments,
  segThroughRect,
} from '../../lib/geometry';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

/**
 * Reports a sequence flow whose drawn path is routed THROUGH the body of a shape it does not
 * connect to — a flow slashing across an unrelated task.
 *
 * This is the gap bpmnlint's `no-overlapping-elements` leaves open: that rule only compares
 * shape-vs-shape bounds and never inspects edge geometry.
 *
 * Deliberately conservative — comparison is scoped per BPMNPlane, and shapes a flow may
 * legitimately pass over are excluded (see `lib/di.ts#isPassableShape`).
 */
export default function flowThroughElement(): Rule {
  function check(node: ModdleElement, reporter: Reporter): void {
    if (node.$type !== 'bpmn:Definitions') {
      return;
    }

    for (const plane of collectByPlane(node)) {
      const obstacles = plane.shapes
        .filter((shape) => !isPassableShape(shape.el, shape.isExpanded))
        .map((shape) => ({ ...shape, bbox: bboxOfRect(shape.bounds) }));

      const flows = plane.edges.filter((edge) => edge.el.$type === 'bpmn:SequenceFlow');

      for (const flow of flows) {
        // Exclude the flow's own source/target, and — when an endpoint is a boundary event —
        // its host activity, because the flow starts on the host's border.
        const endpoints = new Set<string>(flowEndpointIds(flow.el));

        for (const ref of [flow.el.sourceRef, flow.el.targetRef]) {
          if (inst(ref, 'bpmn:BoundaryEvent') && ref.attachedToRef) {
            endpoints.add(ref.attachedToRef.id);
          }
        }

        const flowSegments = segments(flow.waypoints);
        const flowBox = bboxOfPoints(flow.waypoints);

        for (const shape of obstacles) {
          if (endpoints.has(shape.el.id)) {
            continue;
          }

          if (bboxDisjoint(flowBox, shape.bbox)) {
            continue; // cheap reject
          }

          if (flowSegments.some(([start, end]) => segThroughRect(start, end, shape.bounds))) {
            reporter.report(flow.el.id, `Sequence flow is routed through element <${shape.el.id}>`);
          }
        }
      }
    }
  }

  return { check };
}
