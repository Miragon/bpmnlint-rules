import type { ModdleElement, Reporter, Rule } from '../../core/moddle';
import { DiagramPlane } from './DiagramPlane';

/**
 * A rule that decides on DI coordinates. bpmnlint visits every element, but a layout rule needs the
 * whole diagram at once: it runs once, on `bpmn:Definitions`, and is handed one
 * {@link DiagramPlane} at a time so geometry is never compared across planes. It then stops
 * bpmnlint from visiting the rest of the tree, which it has no use for.
 */
export abstract class PlaneRule implements Rule {
  check(node: ModdleElement, reporter: Reporter): false | void {
    if (node.$type !== 'bpmn:Definitions') {
      return;
    }

    for (const plane of DiagramPlane.allOf(node)) {
      this.checkPlane(plane, reporter);
    }

    return false;
  }

  protected abstract checkPlane(plane: DiagramPlane, reporter: Reporter): void;
}
