/**
 * Where a flow docks onto a shape, and how two shapes sit relative to each other — the geometry the
 * connection-side and alignment rules decide on.
 */
import type { Point, Rect, Side } from '../types';

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
  const centerX = horizontalCenter(rect);
  const centerY = verticalCenter(rect);

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
