/**
 * Reading the BPMN diagram interchange (DI) layer: shape bounds (`dc:Bounds`) and edge
 * waypoints — the same data the diagram is rendered from. No semantic guessing, just
 * coordinates and moddle type tests.
 */
import type { ModdleElement } from './moddle';
import type { Point, Rect } from './geometry';

export interface PlaneShape {
  el: ModdleElement;
  bounds: Rect;
  isExpanded: boolean;
}

export interface PlaneEdge {
  el: ModdleElement;
  waypoints: Point[];
}

export interface Plane {
  shapes: PlaneShape[];
  edges: PlaneEdge[];
}

/**
 * Inheritance-safe moddle type test — handles `bpmn:Transaction` extending `bpmn:SubProcess`,
 * `bpmn:AdHocSubProcess`, and so on. Defensive against malformed DI where `bpmnElement` may not
 * be a moddle object at all.
 */
export const inst = (el: ModdleElement, type: string): boolean =>
  !!el && typeof el.$instanceOf === 'function' && el.$instanceOf(type);

/**
 * Shapes that ENCLOSE flows, so a flow drawn "over" them is not a defect: pools, lanes and
 * groups always, and an EXPANDED sub-process. A collapsed sub-process is a task-sized box and
 * therefore a real obstacle.
 */
function isEnclosingContainer(el: ModdleElement, isExpanded: boolean): boolean {
  if (inst(el, 'bpmn:Participant') || inst(el, 'bpmn:Lane') || inst(el, 'bpmn:Group')) {
    return true;
  }

  if (inst(el, 'bpmn:SubProcess')) {
    return isExpanded === true;
  }

  return false;
}

/**
 * Shapes a sequence flow may legitimately pass over, so they are never routing obstacles:
 * enclosing containers, boundary events (they sit on an activity border where flows converge),
 * and decorative overlays — artifacts (text annotations, groups) and data objects/stores.
 */
export function isPassableShape(el: ModdleElement, isExpanded: boolean): boolean {
  return (
    isEnclosingContainer(el, isExpanded) ||
    inst(el, 'bpmn:BoundaryEvent') ||
    inst(el, 'bpmn:Artifact') ||
    inst(el, 'bpmn:ItemAwareElement')
  );
}

/**
 * Collect DI grouped BY PLANE.
 *
 * Each `bpmndi:BPMNPlane` — the root process/collaboration plus every drill-down of a collapsed
 * sub-process or call activity — is its own coordinate space. Geometry must never be compared
 * across planes, or a drill-down diagram "collides" with the main one.
 */
export function collectByPlane(definitions: ModdleElement): Plane[] {
  const planes: Plane[] = [];

  for (const diagram of definitions.diagrams || []) {
    const plane = diagram.plane;

    if (!plane) {
      continue;
    }

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

    planes.push({ shapes, edges });
  }

  return planes;
}

/** The node ids a sequence flow connects (its source and target). */
export const flowEndpointIds = (flow: ModdleElement): string[] =>
  [flow.sourceRef && flow.sourceRef.id, flow.targetRef && flow.targetRef.id].filter(
    Boolean,
  ) as string[];
