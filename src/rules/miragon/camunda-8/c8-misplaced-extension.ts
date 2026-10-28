import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import {
  C8CheckedElement,
  type ZeebeValue,
} from '../../../lib/engine/c8-extensions/C8CheckedElement';
import { ZeebeSchema } from '../../../lib/engine/c8-extensions/ZeebeSchema';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports zeebe extension elements Camunda 8 does not read where they are: on a host that does not
 * read them (`zeebe:taskDefinition` on a Camunda user task), a child element loose in the
 * extension elements instead of in its container, and input mappings on start, boundary, none
 * intermediate throw and none end events, where only output mappings work.
 */
class C8MisplacedExtension extends EngineRule {
  protected readonly engine: Engine = 'c8';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    const checked = C8CheckedElement.forNode(node);
    if (!checked) {
      return;
    }

    for (const zeebeValue of checked.zeebeValues()) {
      if (zeebeValue.placement === 'loose') {
        this.reportLoose(checked, zeebeValue, reporter);
      } else if (zeebeValue.placement === 'misplaced') {
        this.reportMisplaced(checked, zeebeValue, reporter);
      }
    }
    this.checkIgnoredInputs(checked, reporter);
  }

  private reportLoose(
    checked: C8CheckedElement,
    { value, index, type }: ZeebeValue,
    reporter: Reporter,
  ): void {
    const [container] = ZeebeSchema.instance.containersOf(type);
    checked.report(
      reporter,
      `${type.name} sits directly in the extension elements of ${checked.describe()}, but belongs inside ${container?.name}; Camunda 8 ignores it`,
      checked.extensionPath(index),
      {
        type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
        node: checked.el,
        extensionElement: value,
      },
    );
  }

  private reportMisplaced(
    checked: C8CheckedElement,
    { value, index, type }: ZeebeValue,
    reporter: Reporter,
  ): void {
    const hosts = type.hosts
      .filter((host) => host.startsWith('bpmn:'))
      .map((host) => host.slice('bpmn:'.length))
      .map((host) => `${host.charAt(0).toLowerCase()}${host.slice(1)}`);
    const readOn = hosts.length > 5 ? `${hosts.slice(0, 5).join(', ')}, ...` : hosts.join(', ');
    checked.report(
      reporter,
      `${type.name} on ${checked.describe()} has no effect: Camunda 8 reads it on ${readOn} only`,
      checked.extensionPath(index),
      {
        type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
        node: checked.el,
        extensionElement: value,
      },
    );
  }

  private checkIgnoredInputs(checked: C8CheckedElement, reporter: Reporter): void {
    const ignoredOn = this.inputsIgnoredOn(checked.el);
    if (!ignoredOn) {
      return;
    }
    for (const { value, index, type } of checked.zeebeValues()) {
      if (type.name !== 'zeebe:ioMapping') {
        continue;
      }
      (value.inputParameters ?? []).forEach((input: ModdleElement, inputIndex: number) => {
        checked.report(
          reporter,
          `The input mapping ${input.target ? `to ${input.target} ` : ''}on ${checked.describe()} has no effect: Camunda 8 ignores input mappings on ${ignoredOn} (output mappings work there)`,
          checked.extensionPath(index, 'inputParameters', inputIndex),
          { type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED, node: value, extensionElement: input },
        );
      });
    }
  }

  private inputsIgnoredOn(host: ModdleElement): string | undefined {
    if (is(host, 'bpmn:StartEvent')) {
      return 'start events';
    }
    if (is(host, 'bpmn:BoundaryEvent')) {
      return 'boundary events';
    }
    const hasDefinitions = (host.eventDefinitions ?? []).length > 0;
    if (is(host, 'bpmn:IntermediateThrowEvent') && !hasDefinitions) {
      return 'none intermediate throw events';
    }
    if (is(host, 'bpmn:EndEvent') && !hasDefinitions) {
      return 'none end events';
    }
    return undefined;
  }
}

export default defineRule(
  {
    ruleName: 'c8-misplaced-extension',
    kind: 'engine-specific',
    targetEngine: 'c8',
    impact: 'runtime',
  },
  C8MisplacedExtension,
);
