import { flowEndpointIds, inst, isPassableShape, PlaneRule } from '../../lib/di';
import type { DiagramPlane, PlaneEdge } from '../../lib/di';
import { BboxIndex, bboxOfPoints, bboxOfRect, segments, segThroughRect } from '../../lib/geometry';
import type { Reporter } from '../../lib/moddle';
import { defineRule } from '../../lib/utils/defineRule';

/**
 * Reports a sequence flow whose drawn path is routed THROUGH the body of a shape it does not
 * connect to — a flow slashing across an unrelated task.
 *
 * This is the gap bpmnlint's `no-overlapping-elements` leaves open: that rule only compares
 * shape-vs-shape bounds and never inspects edge geometry.
 *
 * Deliberately conservative — comparison is scoped per BPMNPlane, and shapes a flow may
 * legitimately pass over are excluded (see {@link isPassableShape}).
 */
class FlowThroughElement extends PlaneRule {
  protected checkPlane(plane: DiagramPlane, reporter: Reporter): void {
    const obstacles = plane.shapes.filter((shape) => !isPassableShape(shape.el, shape.isExpanded));
    const obstacleIndex = new BboxIndex(obstacles.map((shape) => bboxOfRect(shape.bounds)));

    for (const flow of plane.sequenceFlows) {
      const connected = this.connectedShapeIds(flow);
      const flowSegments = segments(flow.waypoints);

      for (const index of obstacleIndex.overlapping(bboxOfPoints(flow.waypoints))) {
        const shape = obstacles[index]!;

        if (connected.has(shape.el.id)) {
          continue;
        }

        if (flowSegments.some(([start, end]) => segThroughRect(start, end, shape.bounds))) {
          reporter.report(flow.el.id, `Sequence flow is routed through element <${shape.el.id}>`);
        }
      }
    }
  }

  /**
   * The flow's own source/target, and — when an endpoint is a boundary event — its host activity,
   * because the flow starts on the host's border.
   */
  private connectedShapeIds(flow: PlaneEdge): Set<string> {
    const connected = new Set<string>(flowEndpointIds(flow.el));

    for (const ref of [flow.el.sourceRef, flow.el.targetRef]) {
      if (inst(ref, 'bpmn:BoundaryEvent') && ref.attachedToRef) {
        connected.add(ref.attachedToRef.id);
      }
    }

    return connected;
  }
}

export default defineRule(
  { ruleName: 'flow-through-element', kind: 'layout-hint' },
  FlowThroughElement,
);
