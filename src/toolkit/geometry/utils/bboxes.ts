import type { Bbox, Point, Rect, Side } from '../types';

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

/** The rectangle shrunk by `inset` on every side. */
export const insetRect = (rect: Rect, inset: number): Rect => ({
  x: rect.x + inset,
  y: rect.y + inset,
  width: rect.width - 2 * inset,
  height: rect.height - 2 * inset,
});

/** Cheap reject before the exact geometry test. */
export const bboxDisjoint = (first: Bbox, second: Bbox): boolean =>
  first.maxX < second.minX ||
  second.maxX < first.minX ||
  first.maxY < second.minY ||
  second.maxY < first.minY;

const isFiniteSpan = (low: number, high: number): boolean =>
  high - low >= 0 && high - low < Infinity;

/** Finite on both axes and not inverted. */
export const isWellFormedBbox = (box: Bbox): boolean =>
  isFiniteSpan(box.minX, box.maxX) && isFiniteSpan(box.minY, box.maxY);

/**
 * The side of `outer` that `inner` lies entirely beyond while sharing part of `outer`'s extent along
 * that side: `bottom` for a rect below `outer` that shares some of its x range, `right` for one
 * beside it that shares some of its y range. A rect may touch the side; sharing only an end point
 * of the range does not count. `undefined` for a rect diagonally off a corner or one that overlaps
 * `outer`.
 */
export const sideOutside = (inner: Rect, outer: Rect): Side | undefined => {
  const sharesX = inner.x < outer.x + outer.width && outer.x < inner.x + inner.width;
  const sharesY = inner.y < outer.y + outer.height && outer.y < inner.y + inner.height;

  if (sharesX && inner.y + inner.height <= outer.y) {
    return 'top';
  }

  if (sharesX && inner.y >= outer.y + outer.height) {
    return 'bottom';
  }

  if (sharesY && inner.x + inner.width <= outer.x) {
    return 'left';
  }

  if (sharesY && inner.x >= outer.x + outer.width) {
    return 'right';
  }

  return undefined;
};
