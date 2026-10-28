import { is } from 'bpmnlint-utils';

import type { Engine } from '../../bpmnlint-config';
import type { ModdleElement, Reporter } from '../../moddle';
import { EngineRule } from '../EngineRule';

/**
 * A Camunda 7 rule over the content the engines deploy: executable processes only, and nothing
 * inside an ad-hoc sub-process, which the engines skip with its content (the ad-hoc sub-process
 * itself is still checked).
 */
export abstract class C7ExecutableRule extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): boolean | void {
    if (is(node, 'bpmn:Process') && node.get('isExecutable') !== true) {
      return false;
    }
    this.checkExecutable(node, reporter);
    if (is(node, 'bpmn:AdHocSubProcess')) {
      return false;
    }
  }

  protected abstract checkExecutable(node: ModdleElement, reporter: Reporter): void;
}
