/**
 * Pure 2D geometry. No BPMN, no moddle, no DI — just points, segments and rectangles.
 *
 * Everything the layout rules decide is computed from coordinates the diagram is actually
 * rendered from, so the answers are deterministic and reproducible.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Bbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

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

/**
 * Proper crossing: each segment strictly separates the other's endpoints.
 *
 * Excludes collinear overlap and shared/touching endpoints. Used by {@link segThroughRect} to
 * decide whether a flow segment cuts a shape's border.
 */
function properCross(
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

/** Consecutive waypoint pairs as line segments. */
export const segments = (waypoints: Point[]): [Point, Point][] =>
  waypoints.slice(0, -1).map((point, index) => [point, waypoints[index + 1]!]);

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
    properCross(start, end, corner, corners[(index + 1) % corners.length]!),
  );
}

/** Axis-aligned bounding box of a point set. */
export const bboxOfPoints = (points: Point[]): Bbox =>
  points.reduce<Bbox>(
    (box, point) => ({
      minX: Math.min(box.minX, point.x),
      minY: Math.min(box.minY, point.y),
      maxX: Math.max(box.maxX, point.x),
      maxY: Math.max(box.maxY, point.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );

export const bboxOfRect = (rect: Rect): Bbox => ({
  minX: rect.x,
  minY: rect.y,
  maxX: rect.x + rect.width,
  maxY: rect.y + rect.height,
});

/** Cheap reject before the exact geometry test. */
export const bboxDisjoint = (first: Bbox, second: Bbox): boolean =>
  first.maxX < second.minX ||
  second.maxX < first.minX ||
  first.maxY < second.minY ||
  second.maxY < first.minY;
