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

/** Reports an error end event that throws no error, or an error without an errorCode, which Camunda 7 refuses to deploy. */
class C7Error extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:EndEvent') || !C7ExecutableScope.contains(node)) {
      return;
    }

    const definitions = new C7EventDefinitions(node);
    const label = describeElement(node);
    for (const definition of definitions.actedOn()) {
      if (!is(definition, 'bpmn:ErrorEventDefinition')) {
        continue;
      }
      const error = definition.errorRef;
      if (!error) {
        reportErrors(node, reporter, {
          message: `${label} throws no error (no errorRef); the engines refuse the file`,
          path: definitions.pathTo(definition, 'errorRef'),
          data: {
            type: ERROR_TYPES.PROPERTY_REQUIRED,
            node: definition,
            parentNode: node,
            requiredProperty: 'errorRef',
          },
        });
      } else if (!String(error.errorCode ?? '').trim()) {
        reportErrors(node, reporter, {
          message: `Error ${error.id} thrown by ${label} has no errorCode; the engines refuse the file`,
          path: definitions.pathTo(definition, 'errorRef', 'errorCode'),
          data: {
            type: ERROR_TYPES.PROPERTY_REQUIRED,
            node: error,
            parentNode: node,
            requiredProperty: 'errorCode',
          },
        });
      }
    }
  }
}

export default defineRule(
  { ruleName: 'c7-error', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7Error,
);
