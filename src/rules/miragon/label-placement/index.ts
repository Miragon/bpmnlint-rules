import { inst, isPassableShape, PlaneRule } from '../../../toolkit/diagram';
import { ExternalLabelLayout } from '../../../toolkit/diagram/ExternalLabelLayout';
import { isLabelExternal } from '../../../toolkit/diagram/utils/elements';
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

const GRAZE_TOLERANCE = 2;

/**
 * The width bpmn-js lays a new external label out in (`DEFAULT_LABEL_SIZE` in
 * `bpmn-js/lib/util/LabelUtil.js`), so it breaks a longer word itself.
 */
const DEFAULT_MAX_WIDTH = 90;

export interface LabelPlacementConfig {
  /**
   * The widest label, in px, the rule asks for to keep every word whole. A word that only a wider
   * label keeps whole may break. Defaults to {@link DEFAULT_MAX_WIDTH}.
   */
  maxWidth?: number;
}

interface Label {
  el: ModdleElement;
  name: string;
  bounds: Rect;
}

/**
 * Reports a label that is hard to read: its bounds overlap a sequence flow or a shape, or they are
 * so narrow that bpmn-js breaks a word of the name across two lines although a label at most
 * `maxWidth` wide would keep it whole.
 *
 * Comparison is scoped per BPMNPlane.
 */
class LabelPlacement extends PlaneRule {
  private readonly maxWidth: number;

  constructor(config?: LabelPlacementConfig) {
    super();
    this.maxWidth = config?.maxWidth ?? DEFAULT_MAX_WIDTH;
  }

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
      label && isLabelExternal(el) && el.name?.trim()
        ? [{ el, name: el.name as string, bounds: label }]
        : [],
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
    const brokenWord = new ExternalLabelLayout(name).brokenWord(bounds.width);

    if (brokenWord && brokenWord.requiredWidth <= this.maxWidth) {
      reporter.report(
        el.id,
        `Label is too narrow, so bpmn-js breaks the word "${brokenWord.word}"; widen it to at least ${brokenWord.requiredWidth}px`,
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
