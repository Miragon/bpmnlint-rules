/**
 * The public `di` namespace: reading the BPMN diagram interchange layer plane by plane, and the
 * {@link PlaneRule} base the layout rules are built on.
 */
export { DiagramPlane } from './DiagramPlane';
export type { PlaneEdge, PlaneShape } from './DiagramPlane';
export { PlaneRule } from './PlaneRule';
export { flowEndpointIds, inst, isPassableShape } from './utils/elements';
export { markerZones } from './utils/activityMarkers';
export type { MarkerZone } from './utils/activityMarkers';
