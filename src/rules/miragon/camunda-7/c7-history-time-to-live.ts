import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7ExecutableRule } from '../../../lib/engine/c7-implementation/C7ExecutableRule';
import { CamundaAttributes } from '../../../lib/engine/c7-implementation/CamundaAttributes';
import { nonEmpty } from '../../../lib/engine/c7-implementation/utils/values';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

const MAX_DAYS = 2147483647;

/**
 * Reports a `camunda:historyTimeToLive` that is not a number of days (or `P<n>D`), which Camunda 7
 * refuses to deploy. A missing one is camunda-compat's `history-time-to-live`.
 */
class C7HistoryTimeToLive extends C7ExecutableRule {
  protected checkExecutable(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:Process')) {
      return;
    }
    const timeToLive = new CamundaAttributes(node).defined('historyTimeToLive');
    if (!nonEmpty(timeToLive) || this.isDayCount(timeToLive)) {
      return;
    }
    reportErrors(node, reporter, {
      message: `camunda:historyTimeToLive="${timeToLive}" of process ${node.id} is not a number of days (or P<n>D); the engines refuse it`,
      path: ['historyTimeToLive'],
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node,
        parentNode: null,
        property: 'historyTimeToLive',
      },
    });
  }

  private isDayCount(timeToLive: string): boolean {
    const days = /^\+?(\d+)$/.exec(timeToLive) ?? /^P(\d+)D$/.exec(timeToLive);
    return !!days && Number(days[1]) <= MAX_DAYS;
  }
}

export default defineRule(
  {
    ruleName: 'c7-history-time-to-live',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'deploy',
  },
  C7HistoryTimeToLive,
);
