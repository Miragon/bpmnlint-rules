import type { ModdleElement, Reporter, Rule } from '../moddle';
import { DiagramPlane } from './DiagramPlane';

/**
 * A rule that decides on DI coordinates. bpmnlint visits every element, but a layout rule needs the
 * whole diagram at once: it runs once, on `bpmn:Definitions`, and is handed one
 * {@link DiagramPlane} at a time so geometry is never compared across planes.
 */
export abstract class PlaneRule implements Rule {
  check(node: ModdleElement, reporter: Reporter): void {
    if (node.$type !== 'bpmn:Definitions') {
      return;
    }

    for (const plane of DiagramPlane.allOf(node)) {
      this.checkPlane(plane, reporter);
    }
  }

  protected abstract checkPlane(plane: DiagramPlane, reporter: Reporter): void;
}
