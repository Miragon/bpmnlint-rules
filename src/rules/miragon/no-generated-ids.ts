import { isAny } from 'bpmnlint-utils';

import { isGeneratedId } from '../../lib/naming';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

/**
 * Reports IDs that were generated rather than chosen — `Activity_0049ryx`, `Gateway_1x9j8k7`,
 * `StartEvent_1`.
 *
 * This is the single highest-yield check for an AI-authored model. An agent that adds an
 * element copies the modeler's habit of stamping a random token, and the result is a model
 * whose diff is unreadable and whose generated constants are meaningless. Unlike
 * `element-id-naming` it enforces no convention of its own, which makes it the cheap first step
 * for a codebase that has not agreed on one yet.
 *
 * Scoped to flow nodes, sequence flows, participants and lanes: the things a reviewer points at.
 * Message, error and signal names are technical correlation keys and belong to the engine.
 */
const CHECKED = ['bpmn:FlowNode', 'bpmn:SequenceFlow', 'bpmn:Participant', 'bpmn:Lane'];

export default function noGeneratedIds(): Rule {
  function check(node: ModdleElement, reporter: Reporter): void {
    if (!node.id || !isAny(node, CHECKED)) {
      return;
    }

    if (isGeneratedId(node.id)) {
      reporter.report(node.id, 'Element id looks generated — give it a readable, stable name');
    }
  }

  return { check };
}
