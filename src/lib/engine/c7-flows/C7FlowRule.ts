import { is } from 'bpmnlint-utils';

import type { Engine } from '../../bpmnlint-config';
import type { ModdleElement, Reporter } from '../../moddle';
import { EngineRule } from '../EngineRule';

/**
 * A Camunda 7 rule over what the engines run: executable processes, without the content of an
 * ad-hoc sub-process, which they skip like a non-executable process. The ad-hoc sub-process
 * itself is still checked.
 */
export abstract class C7FlowRule extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): boolean | void {
    if (is(node, 'bpmn:Process') && node.isExecutable !== true) {
      return false;
    }
    this.checkRunElement(node, reporter);
    if (is(node, 'bpmn:AdHocSubProcess')) {
      return false;
    }
  }

  protected abstract checkRunElement(node: ModdleElement, reporter: Reporter): void;
}
