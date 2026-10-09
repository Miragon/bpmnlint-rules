/**
 * Where bpmn-js draws the decorations of an activity: the marker row at the bottom centre and the
 * task type icon at the top left.
 *
 * NOTE: Kept in sync with `bpmn-js` (`lib/draw/BpmnRenderer.js`, `renderTaskMarkers` and the task
 * renderers). The values are copied here to avoid a (heavy) dependency on `bpmn-js`.
 */
import { inst, type PlaneShape } from './di';
import type { Rect } from './geometry';

export interface MarkerZone {
  label: string;
  zone: Rect;
}

const MARKER_ROW = { offsetFromBottom: 20, height: 13 };
const SINGLE_MARKER_REACH = 8;
const NEIGHBOUR_MARKER_REACH = 25;
const TASK_TYPE_ICON = { x: 5, y: 5, width: 21, height: 18 };

function markerRowZone({ el, bounds, isExpanded }: PlaneShape): Rect | null {
  const isAdHoc = inst(el, 'bpmn:AdHocSubProcess');
  const isCollapsed = inst(el, 'bpmn:CallActivity') || (inst(el, 'bpmn:SubProcess') && !isExpanded);
  const hasLoop = !!el.loopCharacteristics;

  if (!isAdHoc && !isCollapsed && !hasLoop) {
    return null;
  }

  const loopSitsLeftOfNeighbour = hasLoop && (isCollapsed || isAdHoc);
  const adHocSitsRightOfNeighbour = isAdHoc && isCollapsed;
  const reachLeft = loopSitsLeftOfNeighbour ? NEIGHBOUR_MARKER_REACH : SINGLE_MARKER_REACH;
  const reachRight = adHocSitsRightOfNeighbour ? NEIGHBOUR_MARKER_REACH : SINGLE_MARKER_REACH;

  return {
    x: bounds.x + bounds.width / 2 - reachLeft,
    y: bounds.y + bounds.height - MARKER_ROW.offsetFromBottom,
    width: reachLeft + reachRight,
    height: MARKER_ROW.height,
  };
}

const hasTaskTypeIcon = (el: PlaneShape['el']): boolean =>
  inst(el, 'bpmn:Task') && el.$type !== 'bpmn:Task';

/** The zones of an activity shape that carry a marker or icon, in diagram coordinates. */
export function markerZones(shape: PlaneShape): MarkerZone[] {
  const zones: MarkerZone[] = [];
  const markerRow = markerRowZone(shape);

  if (markerRow) {
    zones.push({ label: 'activity marker', zone: markerRow });
  }

  if (hasTaskTypeIcon(shape.el)) {
    zones.push({
      label: 'task type icon',
      zone: {
        ...TASK_TYPE_ICON,
        x: shape.bounds.x + TASK_TYPE_ICON.x,
        y: shape.bounds.y + TASK_TYPE_ICON.y,
      },
    });
  }

  return zones;
}
