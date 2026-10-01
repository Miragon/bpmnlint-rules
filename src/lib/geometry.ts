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
 * Do two line segments cross each other (form an X)?
 *
 * A thin public wrapper over {@link properCross}: each segment strictly separates the other's
 * endpoints. Collinear overlap ("running on top of each other") and shared or touching endpoints are
 * deliberately NOT crossings, so two flows that merely overlap or fan out from a common node don't
 * count.
 */
export const segmentsCross = (
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point,
): boolean => properCross(firstStart, firstEnd, secondStart, secondEnd);

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
 * How many bends (direction changes) does a waypoint polyline make?
 *
 * The unit direction of each segment is compared with the one before it; a change larger than
 * `toleranceDeg` counts as one bend. Zero-length segments (duplicate waypoints) are dropped, and a
 * straight run split across several waypoints collapses to no bend, so only genuine corners count.
 * A right-angle turn or a full reversal is a bend; a few pixels of rounding is not. A straight or
 * single-segment flow has zero bends.
 */
export function bendCount(waypoints: Point[], toleranceDeg = 5): number {
  const directions: Point[] = [];
  for (const [start, end] of segments(waypoints)) {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const length = Math.hypot(deltaX, deltaY);
    if (length < 1e-6) {
      continue; // duplicate/degenerate waypoint, not a segment
    }
    directions.push({ x: deltaX / length, y: deltaY / length });
  }

  if (directions.length < 2) {
    return 0;
  }

  const cosTolerance = Math.cos((toleranceDeg * Math.PI) / 180);
  let bends = 0;
  for (let index = 1; index < directions.length; index++) {
    const previous = directions[index - 1]!;
    const current = directions[index]!;
    const dot = previous.x * current.x + previous.y * current.y;
    if (dot < cosTolerance) {
      bends++;
    }
  }
  return bends;
}

/**
 * Does a waypoint polyline make monotone progress, never reversing on either axis?
 *
 * A monotone path only ever moves in one horizontal direction and one vertical direction (a
 * straight line, an L, a Z, a staircase that steps toward its target across rows or lanes), so it
 * reads as steady progress and never doubles back. As soon as it moves right after moving left, or
 * down after moving up, it has reversed: it wraps back on itself (every loop-back does) or wanders.
 *
 * Orthogonal routing is assumed (a slant is a separate concern), so each segment is judged only on
 * its dominant axis: a near-horizontal segment's minor-axis drift is not a turn and must not
 * register a vertical direction, or a clean staircase whose rung drifts a few pixels would read as a
 * reversal. Moves smaller than `tolerance` on the dominant axis are ignored as rounding.
 */
export function isMonotonePath(waypoints: Point[], tolerance = 1): boolean {
  let xSign = 0;
  let ySign = 0;
  for (const [start, end] of segments(waypoints)) {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      if (Math.abs(deltaX) > tolerance) {
        const sign = Math.sign(deltaX);
        if (xSign !== 0 && sign !== xSign) {
          return false;
        }
        xSign = sign;
      }
    } else {
      if (Math.abs(deltaY) > tolerance) {
        const sign = Math.sign(deltaY);
        if (ySign !== 0 && sign !== ySign) {
          return false;
        }
        ySign = sign;
      }
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

/** The outward unit normal of a rectangle side — the direction a flow docked on that side runs. */
const OUTWARD_NORMAL: Record<Side, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

/**
 * How far the first bit of an edge runs straight out of (or into) a shape before it turns — the
 * length of its docking "stub". `dock` is the waypoint on the shape's border, `next` the adjacent
 * waypoint; the result is their offset projected onto `side`'s outward normal. A flow that docks and
 * immediately turns (next waypoint directly above/beside the dock) has a stub of `0`; a value can go
 * negative if the edge doubles back into the shape's side.
 */
export const stubLength = (dock: Point, next: Point, side: Side): number => {
  const normal = OUTWARD_NORMAL[side];
  return (next.x - dock.x) * normal.x + (next.y - dock.y) * normal.y;
};

/** The vertical centre (mid-height) of a rectangle — the row a shape is drawn on. */
const verticalCenter = (rect: Rect): number => rect.y + rect.height / 2;

/** The horizontal centre (mid-width) of a rectangle — the column a shape is drawn in. */
const horizontalCenter = (rect: Rect): number => rect.x + rect.width / 2;

/**
 * Does a flow run right-to-left — its target drawn clearly left of its source? Such an edge is a
 * return / loop-back flow, for which the left-to-right docking convention is mirrored (entered from
 * the right, left to the left). `tolerance` keeps a near-vertical loop — target in roughly the same
 * column as its source — from counting as backward.
 */
export const isBackwardFlow = (source: Rect, target: Rect, tolerance = 10): boolean =>
  horizontalCenter(target) < horizontalCenter(source) - tolerance;

/**
 * Do two rectangles sit on the same horizontal row — their vertical centres within `tolerance`?
 *
 * Used to check that an outgoing flow's source and target are drawn at the same height, so the main
 * path reads as a straight horizontal line rather than sloping up or down.
 */
export const sameRow = (first: Rect, second: Rect, tolerance = 10): boolean =>
  Math.abs(verticalCenter(first) - verticalCenter(second)) <= tolerance;

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
