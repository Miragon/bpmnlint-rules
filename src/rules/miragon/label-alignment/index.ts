import { inst, PlaneRule } from '../../../toolkit/diagram';
import { ExternalLabelLayout } from '../../../toolkit/diagram/ExternalLabelLayout';
import { isEnclosingContainer, isLabelExternal } from '../../../toolkit/diagram/utils/elements';
import type { DiagramPlane, PlaneEdge } from '../../../toolkit/diagram';
import {
  BboxIndex,
  bboxOfPoints,
  bboxOfRect,
  insetRect,
  segments,
  segThroughRect,
  sideOutside,
} from '../../../toolkit/geometry';
import type { Rect, Side } from '../../../toolkit/geometry';
import type { ModdleElement, Reporter } from '../../../core/moddle';
import { defineRule } from '../../../core/utils/defineRule';

/**
 * How far, in px, a label may sit off its element's centre line. bpmn-js itself places a label
 * up to 1px off, because it rounds the label's position and width.
 */
const CENTRE_TOLERANCE = 2;

/**
 * How far a centred label may reach into a flow, shape or label before it counts as blocked, the
 * same graze `label-placement` allows.
 */
const GRAZE_TOLERANCE = 2;

/**
 * Something drawn on the plane that a centred label must stay clear of: a shape other than an
 * enclosing container, or another element's label.
 */
interface Obstacle {
  owner: ModdleElement;
  bounds: Rect;
}

/**
 * Reports an event or gateway label that sits on one side of its element (above, below, left or
 * right of it, sharing its range along that side) but more than {@link CENTRE_TOLERANCE} px off the
 * element's centre line. It measures the bounds bpmn-js draws the label at. A label that would run
 * into a flow, a shape or another label once centred is left alone: it was moved out of the way,
 * and centring it would trade a cosmetic finding for a real overlap.
 *
 * Comparison is scoped per BPMNPlane.
 */
class LabelAlignment extends PlaneRule {
  protected checkPlane(plane: DiagramPlane, reporter: Reporter): void {
    const obstacles = this.obstacles(plane);
    const obstacleIndex = new BboxIndex(obstacles.map((obstacle) => bboxOfRect(obstacle.bounds)));
    const edges = plane.edges;
    const edgeIndex = new BboxIndex(edges.map((edge) => bboxOfPoints(edge.waypoints)));

    for (const { el, bounds, label: storedLabel } of plane.shapes) {
      const label =
        storedLabel && this.isChecked(el)
          ? new ExternalLabelLayout(el.name).drawnBounds(storedLabel)
          : undefined;
      const side = label && sideOutside(label, bounds);

      if (!label || !side) {
        continue;
      }

      const offset = this.offsetFromCentre(label, bounds, side);

      if (Math.abs(offset) <= CENTRE_TOLERANCE) {
        continue;
      }

      const centred = insetRect(this.centred(label, side, offset), GRAZE_TOLERANCE);
      const blocked =
        this.isCrossedByEdge(centred, edges, edgeIndex) ||
        obstacleIndex
          .overlapping(bboxOfRect(centred))
          .some((index) => obstacles[index]!.owner !== el);

      if (!blocked) {
        reporter.report(el.id, this.message(side, offset));
      }
    }
  }

  private isChecked(el: ModdleElement): boolean {
    const isEventOrGateway =
      (inst(el, 'bpmn:Event') && !inst(el, 'bpmn:BoundaryEvent')) || inst(el, 'bpmn:Gateway');

    return isEventOrGateway && !!el.name?.trim();
  }

  private obstacles(plane: DiagramPlane): Obstacle[] {
    const shapes = plane.shapes
      .filter((shape) => !isEnclosingContainer(shape.el, shape.isExpanded))
      .map((shape) => ({ owner: shape.el, bounds: shape.bounds }));
    const labels = [...plane.shapes, ...plane.edges].flatMap(({ el, label }) =>
      label && isLabelExternal(el) && el.name?.trim() ? [{ owner: el, bounds: label }] : [],
    );

    return [...shapes, ...labels];
  }

  /**
   * How far the label's centre sits from the element's centre line, along the side it is on,
   * rounded to a tenth of a pixel (half away from zero, so both directions round alike) so the
   * comparison and the message use the same value.
   */
  private offsetFromCentre(label: Rect, bounds: Rect, side: Side): number {
    const offset =
      side === 'top' || side === 'bottom'
        ? label.x + label.width / 2 - (bounds.x + bounds.width / 2)
        : label.y + label.height / 2 - (bounds.y + bounds.height / 2);

    return (Math.sign(offset) * Math.round(Math.abs(offset) * 10)) / 10;
  }

  private centred(label: Rect, side: Side, offset: number): Rect {
    return side === 'top' || side === 'bottom'
      ? { ...label, x: label.x - offset }
      : { ...label, y: label.y - offset };
  }

  private isCrossedByEdge(area: Rect, edges: readonly PlaneEdge[], edgeIndex: BboxIndex): boolean {
    return edgeIndex
      .overlapping(bboxOfRect(area))
      .some((index) =>
        segments(edges[index]!.waypoints).some(([start, end]) => segThroughRect(start, end, area)),
      );
  }

  private message(side: Side, offset: number): string {
    const distance = Math.abs(offset);
    const horizontal = side === 'top' || side === 'bottom';
    const [position, move] = horizontal
      ? offset > 0
        ? ['right of', 'left']
        : ['left of', 'right']
      : offset > 0
        ? ['below', 'up']
        : ['above', 'down'];

    return `Label is ${distance}px ${position} the centre of its element; move it ${distance}px ${move}`;
  }
}

export default defineRule({ ruleName: 'label-alignment', kind: 'cosmetic' }, LabelAlignment);
