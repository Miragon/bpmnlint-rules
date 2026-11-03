/**
 * Pure 2D geometry over segments and polylines. No BPMN, no moddle, no DI — just points, segments
 * and rectangles.
 *
 * Everything the layout rules decide is computed from coordinates the diagram is actually
 * rendered from, so the answers are deterministic and reproducible.
 */
import type { Point, Rect } from '../types';

/**
 * Which side of the line `lineStart -> lineEnd` does `point` fall on?
 *
 * The sign of the 2D cross product: negative for one side, positive for the other, zero when all
 * three are collinear. This is the primitive both intersection tests are built on.
 */
const sideOfLine = (lineStart: Point, lineEnd: Point, point: Point): number =>
  Math.sign(
    (lineEnd.x - lineStart.x) * (point.y - lineStart.y) -
      (lineEnd.y - lineStart.y) * (point.x - lineStart.x),
  );

/** Consecutive waypoint pairs as line segments. */
export const segments = (waypoints: Point[]): [Point, Point][] =>
  waypoints.slice(0, -1).map((point, index) => [point, waypoints[index + 1]!]);

/**
 * Do two line segments cross each other (form an X)?
 *
 * Each segment strictly separates the other's endpoints. Collinear overlap ("running on top of each
 * other") and shared or touching endpoints are deliberately NOT crossings, so two flows that merely
 * overlap or fan out from a common node don't count.
 */
export function segmentsCross(
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point,
): boolean {
  const secondStartSide = sideOfLine(firstStart, firstEnd, secondStart);
  const secondEndSide = sideOfLine(firstStart, firstEnd, secondEnd);
  const firstStartSide = sideOfLine(secondStart, secondEnd, firstStart);
  const firstEndSide = sideOfLine(secondStart, secondEnd, firstEnd);

  return secondStartSide * secondEndSide < 0 && firstStartSide * firstEndSide < 0;
}

/**
 * Is every segment of the polyline horizontal or vertical (within `toleranceDeg` of an axis)?
 *
 * BPMN sequence flows are routed orthogonally, so a segment that runs on a slant, moving on both
 * axes at once, is a routing defect. A segment is judged by the ratio of its shorter axis span to
 * its longer one: at or below `tan(toleranceDeg)` it counts as axis-aligned, so a few pixels of
 * drift on a long segment stays orthogonal while a genuine diagonal does not. Zero-length segments
 * are ignored.
 */
export function isOrthogonalPath(waypoints: Point[], toleranceDeg = 10): boolean {
  const maxRatio = Math.tan((toleranceDeg * Math.PI) / 180);
  for (const [start, end] of segments(waypoints)) {
    const deltaX = Math.abs(end.x - start.x);
    const deltaY = Math.abs(end.y - start.y);
    const shorter = Math.min(deltaX, deltaY);
    const longer = Math.max(deltaX, deltaY);
    if (longer < 1e-6) {
      continue; // zero-length segment, no direction
    }
    if (shorter / longer > maxRatio) {
      return false; // slanted: moves meaningfully on both axes
    }
  }
  return true;
}

/**
 * Is the point strictly inside the rectangle? `padding` keeps a point sitting exactly on the
 * border (where flows legitimately attach) from counting as "inside".
 */
const isInside = (point: Point, rect: Rect, padding = 1): boolean =>
  point.x > rect.x + padding &&
  point.x < rect.x + rect.width - padding &&
  point.y > rect.y + padding &&
  point.y < rect.y + rect.height - padding;

/** Does a segment enter the rectangle's interior (not merely graze a corner or border)? */
export function segThroughRect(start: Point, end: Point, rect: Rect): boolean {
  if (isInside(start, rect) || isInside(end, rect)) {
    return true;
  }

  const corners: Point[] = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];

  return corners.some((corner, index) =>
    segmentsCross(start, end, corner, corners[(index + 1) % corners.length]!),
  );
}

/** Does a circle reach into the rectangle (not merely touch its border)? */
export function circleOverlapsRect(center: Point, radius: number, rect: Rect): boolean {
  const nearestX = Math.min(Math.max(center.x, rect.x), rect.x + rect.width);
  const nearestY = Math.min(Math.max(center.y, rect.y), rect.y + rect.height);

  return Math.hypot(center.x - nearestX, center.y - nearestY) < radius;
}
