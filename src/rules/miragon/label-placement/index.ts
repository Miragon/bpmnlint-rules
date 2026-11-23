import { inst, isPassableShape, PlaneRule } from '../../../toolkit/diagram';
import type { DiagramPlane, PlaneEdge, PlaneShape } from '../../../toolkit/diagram';
import {
  BboxIndex,
  bboxOfPoints,
  bboxOfRect,
  insetRect,
  segments,
  segThroughRect,
} from '../../../toolkit/geometry';
import type { Point, Rect } from '../../../toolkit/geometry';
import type { ModdleElement, Reporter } from '../../../core/moddle';
import { defineRule } from '../../../core/utils/defineRule';

const MIN_CHAR_WIDTH_PX = 5;
const GRAZE_TOLERANCE = 2;

interface Label {
  el: ModdleElement;
  name: string;
  bounds: Rect;
}

/**
 * Reports a label that is hard to read: its bounds overlap a sequence flow or a shape, or they are
 * narrower than the longest word of the name, which forces a break inside that word.
 *
 * Comparison is scoped per BPMNPlane.
 */
class LabelPlacement extends PlaneRule {
  protected checkPlane(plane: DiagramPlane, reporter: Reporter): void {
    const obstacles = plane.shapes.filter((shape) => !isPassableShape(shape.el, shape.isExpanded));
    const obstacleIndex = new BboxIndex(obstacles.map((shape) => bboxOfRect(shape.bounds)));
    const flows = plane.sequenceFlows;
    const flowIndex = new BboxIndex(flows.map((flow) => bboxOfPoints(flow.waypoints)));

    for (const { el, name, bounds } of this.namedLabels(plane)) {
      this.reportBrokenWord(el, name, bounds, reporter);

      const overlapArea = insetRect(bounds, GRAZE_TOLERANCE);
      const overlapBox = bboxOfRect(overlapArea);

      for (const index of flowIndex.overlapping(overlapBox)) {
        const flow = flows[index]!;

        if (
          this.crossingSegments(flow, el).some(([start, end]) =>
            segThroughRect(start, end, overlapArea),
          )
        ) {
          reporter.report(el.id, `Label overlaps sequence flow <${flow.el.id}>`);
        }
      }

      for (const index of obstacleIndex.overlapping(overlapBox)) {
        const shape = obstacles[index]!;

        if (!this.isOwnerOrHost(shape, el)) {
          reporter.report(el.id, `Label overlaps element <${shape.el.id}>`);
        }
      }
    }
  }

  private namedLabels(plane: DiagramPlane): Label[] {
    return [...plane.shapes, ...plane.sequenceFlows].flatMap(({ el, label }) =>
      label && el.name?.trim() ? [{ el, name: el.name as string, bounds: label }] : [],
    );
  }

  private crossingSegments(flow: PlaneEdge, labelOwner: ModdleElement): [Point, Point][] {
    const flowSegments = segments(flow.waypoints);

    return flow.el === labelOwner
      ? flowSegments.filter(([start, end]) => start.x !== end.x)
      : flowSegments;
  }

  private reportBrokenWord(
    el: ModdleElement,
    name: string,
    bounds: Rect,
    reporter: Reporter,
  ): void {
    const longestWord = name
      .split(/[\s-]+/)
      .reduce((longest, word) => (word.length > longest.length ? word : longest), '');
    const requiredWidth = longestWord.length * MIN_CHAR_WIDTH_PX;

    if (bounds.width < requiredWidth) {
      reporter.report(
        el.id,
        `Label is narrower than the word "${longestWord}"; widen it to at least ${requiredWidth}px`,
      );
    }
  }

  private isOwnerOrHost(shape: PlaneShape, el: ModdleElement): boolean {
    return (
      shape.el === el || (inst(el, 'bpmn:BoundaryEvent') && shape.el.id === el.attachedToRef?.id)
    );
  }
}

export default defineRule({ ruleName: 'label-placement', kind: 'layout-hint' }, LabelPlacement);
