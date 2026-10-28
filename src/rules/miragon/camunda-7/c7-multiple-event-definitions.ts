import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C7EventDefinitions } from '../../../lib/engine/c7-events/C7EventDefinitions';
import { C7ExecutableScope } from '../../../lib/engine/c7-events/C7ExecutableScope';
import { EngineRule } from '../../../lib/engine/EngineRule';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports an event with several event definitions: Camunda 7 acts on one of them and ignores the
 * others (a message + timer catch event creates only the timer job). It deploys.
 */
class C7MultipleEventDefinitions extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:Event') || !C7ExecutableScope.contains(node)) {
      return;
    }

    const definitions = new C7EventDefinitions(node);
    const all = definitions.all();
    if (all.length < 2) {
      return;
    }

    const kinds = all.map((definition) => C7EventDefinitions.triggerName(definition));
    reportErrors(node, reporter, {
      message: `${describeElement(node)} has ${all.length} event definitions (${kinds.join(', ')}); ${this.consequence(definitions)}`,
      path: ['eventDefinitions'],
      data: {
        type: ERROR_TYPES.ELEMENT_MULTIPLE_NOT_ALLOWED,
        node,
        parentNode: null,
        kept: definitions.acting(),
      },
    });
  }

  private consequence(definitions: C7EventDefinitions): string {
    const acting = definitions.acting();
    if (!acting) {
      return 'the engines act on one of them only and ignore the others';
    }
    const ignored = definitions
      .all()
      .filter((definition) => definition !== acting)
      .map((definition) => C7EventDefinitions.triggerName(definition));
    return `the engines act on the ${C7EventDefinitions.triggerName(acting)} only and ignore the ${ignored.join(' and ')}`;
  }
}

export default defineRule(
  {
    ruleName: 'c7-multiple-event-definitions',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'runtime',
  },
  C7MultipleEventDefinitions,
);
