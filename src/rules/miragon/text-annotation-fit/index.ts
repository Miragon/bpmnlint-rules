import { inst, PlaneRule } from '../../../toolkit/diagram';
import {
  estimatedLineCount,
  longestWord,
  MIN_CHAR_WIDTH_PX,
} from '../../../toolkit/diagram/utils/text';
import type { DiagramPlane, PlaneShape } from '../../../toolkit/diagram';
import type { Reporter } from '../../../core/moddle';
import { defineRule } from '../../../core/utils/defineRule';

const TEXT_ANNOTATION_PADDING_PX = 7;
const LINE_HEIGHT_PX = 12 * 1.2;
const FIRST_LINE_SHIFT_PX = LINE_HEIGHT_PX / 4;

class TextAnnotationFit extends PlaneRule {
  protected checkPlane(plane: DiagramPlane, reporter: Reporter): void {
    for (const shape of plane.shapes) {
      const text: string = shape.el.text ?? '';

      if (inst(shape.el, 'bpmn:TextAnnotation') && text.trim()) {
        this.reportTooNarrow(shape, text, reporter);
        this.reportTooShort(shape, text, reporter);
      }
    }
  }

  private reportTooShort(shape: PlaneShape, text: string, reporter: Reporter): void {
    const textWidth = Math.max(shape.bounds.width - 2 * TEXT_ANNOTATION_PADDING_PX, 0);
    const textHeight = estimatedLineCount(text, textWidth) * LINE_HEIGHT_PX;
    const requiredHeight = textHeight + 2 * TEXT_ANNOTATION_PADDING_PX - FIRST_LINE_SHIFT_PX;

    if (shape.bounds.height < requiredHeight) {
      reporter.report(
        shape.el.id,
        `Text annotation is shorter than its text; raise it to at least ${Math.ceil(requiredHeight)}px`,
      );
    }
  }

  private reportTooNarrow(shape: PlaneShape, text: string, reporter: Reporter): void {
    const word = longestWord(text);
    const requiredWidth = word.length * MIN_CHAR_WIDTH_PX + 2 * TEXT_ANNOTATION_PADDING_PX;

    if (shape.bounds.width < requiredWidth) {
      reporter.report(
        shape.el.id,
        `Text annotation is narrower than the word "${word}"; widen it to at least ${requiredWidth}px`,
      );
    }
  }
}

export default defineRule({ ruleName: 'text-annotation-fit', kind: 'cosmetic' }, TextAnnotationFit);
