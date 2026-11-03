import type { Bbox } from './types';
import { bboxDisjoint, bboxOfPoints, isWellFormedBbox } from './utils/bboxes';

/**
 * Spatial index (uniform grid) over `boxes`, so a caller no longer compares every box with every
 * other one.
 *
 * {@link overlapping} yields the indices of exactly the boxes a linear `!bboxDisjoint(box, query)`
 * scan would keep, in ascending order, but only visits the boxes filed in the grid cells `query`
 * covers. The grid has about one cell per box.
 *
 * A box is only filed when it is local: well-formed (finite, not inverted) and covering no more
 * cells than one grid row holds. Every other box is compared against each query directly, and a
 * query that is not local itself is compared against every box, so the answer never depends on the
 * grid and a diagram full of sprawling boxes costs no more than the linear scan did.
 */
export class BboxIndex {
  private readonly boxes: Bbox[];
  private readonly extent: Bbox;
  private readonly cellsPerAxis: number;
  private readonly cellWidth: number;
  private readonly cellHeight: number;
  private readonly cells: number[][];
  private readonly allIndices: number[];
  private readonly unfiledIndices: number[] = [];

  constructor(boxes: Bbox[]) {
    this.boxes = boxes;
    this.extent = bboxOfPoints(
      boxes.filter(isWellFormedBbox).flatMap((box) => [
        { x: box.minX, y: box.minY },
        { x: box.maxX, y: box.maxY },
      ]),
    );
    this.cellsPerAxis = Math.ceil(Math.sqrt(boxes.length)) || 1;
    this.cellWidth = (this.extent.maxX - this.extent.minX) / this.cellsPerAxis || 1;
    this.cellHeight = (this.extent.maxY - this.extent.minY) / this.cellsPerAxis || 1;
    this.cells = Array.from({ length: this.cellsPerAxis * this.cellsPerAxis }, () => []);
    this.allIndices = Array.from(boxes.keys());

    for (const index of this.allIndices) {
      const covered = this.cellsOfLocalBox(boxes[index]!);

      if (covered) {
        covered.forEach((cell) => cell.push(index));
      } else {
        this.unfiledIndices.push(index);
      }
    }
  }

  /** The indices of every indexed box overlapping `query`, ascending. */
  overlapping(query: Bbox): number[] {
    const overlapsQuery = (index: number): boolean => !bboxDisjoint(this.boxes[index]!, query);
    const covered = this.cellsOfLocalBox(query);

    if (!covered) {
      return this.allIndices.filter(overlapsQuery);
    }

    const filedOverlaps = new Set(covered.flat().filter(overlapsQuery));

    return [...this.unfiledIndices.filter(overlapsQuery), ...filedOverlaps].sort(
      (first, second) => first - second,
    );
  }

  private cellAlongAxis(offset: number, cellSize: number): number {
    const cell = Math.floor(offset / cellSize);
    return cell > 0 ? Math.min(cell, this.cellsPerAxis - 1) : 0;
  }

  private cellsOfLocalBox(box: Bbox): number[][] | undefined {
    if (!isWellFormedBbox(box)) {
      return undefined;
    }

    const firstColumn = this.cellAlongAxis(box.minX - this.extent.minX, this.cellWidth);
    const lastColumn = this.cellAlongAxis(box.maxX - this.extent.minX, this.cellWidth);
    const firstRow = this.cellAlongAxis(box.minY - this.extent.minY, this.cellHeight);
    const lastRow = this.cellAlongAxis(box.maxY - this.extent.minY, this.cellHeight);

    if ((lastColumn - firstColumn + 1) * (lastRow - firstRow + 1) > this.cellsPerAxis) {
      return undefined;
    }

    const covered: number[][] = [];
    for (let row = firstRow; row <= lastRow; row++) {
      for (let column = firstColumn; column <= lastColumn; column++) {
        covered.push(this.cells[row * this.cellsPerAxis + column]!);
      }
    }
    return covered;
  }
}
