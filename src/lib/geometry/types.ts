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

/** The four sides of an axis-aligned rectangle — where a flow docks onto a shape. */
export type Side = 'top' | 'right' | 'bottom' | 'left';
