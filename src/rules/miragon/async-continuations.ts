import { is } from 'bpmnlint-utils';

import { ExecutionEngine } from '../../lib/ExecutionEngine';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';
import { SavePointFlag, SavePointLocator, SavePointPolicy } from '../../lib/savepoints';
import type { SavePointConfig, Slot } from '../../lib/savepoints';
import { defineRule } from '../../lib/utils/defineRule';

const SLOTS: Slot[] = ['before', 'after'];

/**
 * Reports Camunda 7 save points (`camunda:asyncBefore`, `camunda:asyncAfter`) that the configured
 * policy requires but are missing, or forbids but are set.
 *
 * Without a save point a failure rolls back to the last wait state: a user's completion is undone,
 * side effects run twice, or the incident shows at the wrong activity. An unneeded one only adds a
 * job. None of that is visible in the modeler.
 */
class AsyncContinuations implements Rule {
  private readonly locator = new SavePointLocator();
  private readonly policy: SavePointPolicy;

  constructor(config?: SavePointConfig) {
    this.policy = new SavePointPolicy(config);
  }

  check(node: ModdleElement, reporter: Reporter): void {
    if (!node.id || !is(node, 'bpmn:FlowNode') || !ExecutionEngine.is(node, 'c7')) {
      return;
    }

    for (const { flagOwner, key } of this.locator.locate(node)) {
      for (const slot of SLOTS) {
        const expectation = this.policy.expectationFor(key, slot);
        const isFlagSet = SavePointFlag.isSet(flagOwner, slot);
        const flag = SavePointFlag.nameOf(slot);

        if (expectation === 'required' && !isFlagSet) {
          const reason = this.policy.defaultReasonFor(key, slot, expectation);
          reporter.report(
            node.id,
            reason ?? `Add ${flag}: the save-point policy requires it for ${key}`,
          );
        }
        if (expectation === 'forbidden' && isFlagSet) {
          const reason = this.policy.defaultReasonFor(key, slot, expectation);
          reporter.report(
            node.id,
            reason ?? `Remove ${flag}: the save-point policy forbids it for ${key}`,
          );
        }
      }
    }
  }
}

export default defineRule(
  { ruleName: 'async-continuations', kind: 'engine-specific', targetEngine: 'c7' },
  AsyncContinuations,
);
