import type { Point, Rect } from '../geometry/types';
import type { ModdleElement } from '../moddle';

export interface PlaneShape {
  el: ModdleElement;
  bounds: Rect;
  isExpanded: boolean;
}

export interface PlaneEdge {
  el: ModdleElement;
  waypoints: Point[];
}

/**
 * One `bpmndi:BPMNPlane` of a diagram: its shape bounds (`dc:Bounds`) and edge waypoints — the same
 * data the diagram is rendered from.
 *
 * Each plane — the root process/collaboration plus every drill-down of a collapsed sub-process or
 * call activity — is its own coordinate space. Geometry must never be compared across planes, or a
 * drill-down diagram "collides" with the main one; {@link DiagramPlane.allOf} hands them out
 * separately for that reason.
 */
export class DiagramPlane {
  readonly shapes: PlaneShape[];
  readonly edges: PlaneEdge[];
  /** The edges drawing a `bpmn:SequenceFlow`. */
  readonly sequenceFlows: PlaneEdge[];
  private readonly shapeById: Map<string, PlaneShape>;

  private constructor(shapes: PlaneShape[], edges: PlaneEdge[]) {
    this.shapes = shapes;
    this.edges = edges;
    this.sequenceFlows = edges.filter((edge) => edge.el.$type === 'bpmn:SequenceFlow');
    this.shapeById = new Map(shapes.map((shape) => [shape.el.id as string, shape]));
  }

  /** Every plane of the diagrams under `definitions`, each with only its own shapes and edges. */
  static allOf(definitions: ModdleElement): DiagramPlane[] {
    const planes: DiagramPlane[] = [];

    for (const diagram of definitions.diagrams || []) {
      if (diagram.plane) {
        planes.push(DiagramPlane.fromBpmnPlane(diagram.plane));
      }
    }

    return planes;
  }

  private static fromBpmnPlane(plane: ModdleElement): DiagramPlane {
    const shapes: PlaneShape[] = [];
    const edges: PlaneEdge[] = [];

    for (const planeElement of plane.planeElement || []) {
      const el = planeElement.bpmnElement;

      if (!el) {
        continue;
      }

      const { $type: type, bounds, waypoint } = planeElement;

      if (type === 'bpmndi:BPMNShape' && bounds) {
        shapes.push({ el, bounds, isExpanded: planeElement.isExpanded === true });
      } else if (type === 'bpmndi:BPMNEdge' && waypoint && waypoint.length > 1) {
        edges.push({ el, waypoints: waypoint });
      }
    }

    return new DiagramPlane(shapes, edges);
  }

  /** The shape drawing the element with this id on this plane, if any. */
  shapeOf(id: string): PlaneShape | undefined {
    return this.shapeById.get(id);
  }

  /** The bounds of the shape drawing the element with this id on this plane, if any. */
  boundsOf(id: string): Rect | undefined {
    return this.shapeById.get(id)?.bounds;
  }
}
