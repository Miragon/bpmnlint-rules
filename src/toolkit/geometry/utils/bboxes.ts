import type { Bbox, Point, Rect } from '../types';

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

const isFiniteSpan = (low: number, high: number): boolean =>
  high - low >= 0 && high - low < Infinity;

/** Finite on both axes and not inverted. */
export const isWellFormedBbox = (box: Bbox): boolean =>
  isFiniteSpan(box.minX, box.maxX) && isFiniteSpan(box.minY, box.maxY);
