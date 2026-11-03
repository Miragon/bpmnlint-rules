/**
 * The public `geometry` namespace: pure 2D geometry over points, segments and rectangles, plus the
 * {@link BboxIndex} the pairwise layout rules use to stay linear.
 */
export type { Bbox, Point, Rect, Side } from './types';
export { BboxIndex } from './BboxIndex';
export { bboxDisjoint, bboxOfPoints, bboxOfRect } from './utils/bboxes';
export { attachSide, gatewayTipSide, isBackwardFlow, sameRow, stubLength } from './utils/docking';
export {
  circleOverlapsRect,
  isOrthogonalPath,
  segments,
  segmentsCross,
  segThroughRect,
} from './utils/lines';
