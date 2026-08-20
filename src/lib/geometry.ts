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

/** The four sides of an axis-aligned rectangle — where a flow docks onto a shape. */
export type Side = 'top' | 'right' | 'bottom' | 'left';

const near = (first: number, second: number, tolerance: number): boolean =>
  Math.abs(first - second) <= tolerance;

const withinSpan = (value: number, low: number, high: number, tolerance: number): boolean =>
  value >= low - tolerance && value <= high + tolerance;

/**
 * Which side of the rectangle does `point` sit on (within `tolerance`)?
 *
 * `null` when the point is not clearly on exactly one edge — off the border, or on a corner where
 * two edges meet — so the caller skips it rather than guess. Used for box-shaped elements (events,
 * activities); gateways use {@link gatewayTipSide}.
 */
export function attachSide(point: Point, rect: Rect, tolerance = 5): Side | null {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  const sides: Side[] = [];
  if (near(point.x, rect.x, tolerance) && withinSpan(point.y, rect.y, bottom, tolerance)) {
    sides.push('left');
  }
  if (near(point.x, right, tolerance) && withinSpan(point.y, rect.y, bottom, tolerance)) {
    sides.push('right');
  }
  if (near(point.y, rect.y, tolerance) && withinSpan(point.x, rect.x, right, tolerance)) {
    sides.push('top');
  }
  if (near(point.y, bottom, tolerance) && withinSpan(point.x, rect.x, right, tolerance)) {
    sides.push('bottom');
  }

  return sides.length === 1 ? sides[0]! : null;
}

/**
 * A gateway is drawn as a diamond inscribed in `rect`, so the only clean connection points are its
 * four tips — the midpoints of the rectangle's sides. Returns the side whose tip `point` matches
 * (within `tolerance`), or `null` when it sits on a diagonal flank instead ("seitlich").
 */
export function gatewayTipSide(point: Point, rect: Rect, tolerance = 5): Side | null {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  const tips: Record<Side, Point> = {
    top: { x: centerX, y: rect.y },
    right: { x: rect.x + rect.width, y: centerY },
    bottom: { x: centerX, y: rect.y + rect.height },
    left: { x: rect.x, y: centerY },
  };

  let best: Side | null = null;
  let bestDist = Infinity;
  for (const side of Object.keys(tips) as Side[]) {
    const tip = tips[side];
    const dist = Math.hypot(point.x - tip.x, point.y - tip.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = side;
    }
  }

  return bestDist <= tolerance ? best : null;
}
