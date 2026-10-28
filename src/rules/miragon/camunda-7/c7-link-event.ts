import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C7DefinitionSubject } from '../../../lib/engine/c7-events/C7DefinitionSubject';
import { C7EventDefinitions } from '../../../lib/engine/c7-events/C7EventDefinitions';
import { C7ExecutableScope } from '../../../lib/engine/c7-events/C7ExecutableScope';
import { EngineRule } from '../../../lib/engine/EngineRule';
import { LinkEvents } from '../../../lib/engine/LinkEvents';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports the link events Camunda 7 refuses to deploy. Every link definition in the file needs a
 * name (BPMN schema). In what the engines run, link catch names are unique in a process
 * (sub-processes included), and a throw event reached by a sequence flow needs a catch event of its
 * name in its own (sub-)process.
 */
class C7LinkEvent extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (is(node, 'bpmn:LinkEventDefinition')) {
      this.checkName(node, reporter);
    }
    if (is(node, 'bpmn:Process') && C7ExecutableScope.contains(node)) {
      this.checkLinks(node, reporter);
    }
  }

  private checkName(definition: ModdleElement, reporter: Reporter): void {
    if (definition.name !== undefined && definition.name !== null) {
      return;
    }
    const subject = new C7DefinitionSubject(definition);
    reportErrors(subject.target, reporter, {
      message: `${subject.name('Link event')} has no link name, which the BPMN schema requires; the engines refuse the file`,
      path: subject.path('name'),
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: definition,
        parentNode: subject.parentNode,
        requiredProperty: 'name',
      },
    });
  }

  private checkLinks(process: ModdleElement, reporter: Reporter): void {
    const links = new LinkEvents(process, (node) => this.linkName(node));
    for (const { first, el, name } of links.duplicateCatches()) {
      reportErrors(el, reporter, {
        message: `Link catch events ${first.id} and ${el.id} are both named "${name}"; the engines refuse two link catch events with one name in a process (sub-processes included)`,
        path: this.namePath(el),
        data: {
          type: ERROR_TYPES.ELEMENT_PROPERTY_VALUE_DUPLICATED,
          node: el,
          parentNode: null,
          duplicatedProperty: 'name',
          duplicatedPropertyValue: name,
        },
      });
    }
    const targets = this.flowTargets(process);
    for (const { el, name, scope } of links.unmatchedThrows()) {
      if (!targets.has(el)) {
        continue;
      }
      const elsewhere = links.catchNamed(name);
      const missing = elsewhere
        ? `the catch event of that name (${elsewhere.id}) is in another scope`
        : 'no link catch event has that name';
      reportErrors(el, reporter, {
        message: `Link throw event ${el.id} jumps to "${name}", but ${missing}; the engines resolve links within one (sub-)process (${scope.id ?? '<scopeId>'}) and refuse the file`,
        path: this.namePath(el),
        data: {
          type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
          node: el,
          parentNode: null,
          property: 'name',
        },
      });
    }
  }

  /** The name of the link definition the engines act on; none for the content of an ad-hoc sub-process. */
  private linkName(node: ModdleElement): string | undefined {
    if (!C7ExecutableScope.contains(node)) {
      return undefined;
    }
    const name = new C7EventDefinitions(node).ofType('bpmn:LinkEventDefinition')?.name;
    return name ?? undefined;
  }

  private namePath(event: ModdleElement): (string | number)[] {
    const definitions = new C7EventDefinitions(event);
    return definitions.pathTo(definitions.ofType('bpmn:LinkEventDefinition'), 'name');
  }

  /** The flow nodes a sequence flow of the process leads to. */
  private flowTargets(
    scope: ModdleElement,
    targets = new Set<ModdleElement>(),
  ): Set<ModdleElement> {
    for (const element of scope.flowElements ?? []) {
      if (is(element, 'bpmn:SequenceFlow') && element.targetRef) {
        targets.add(element.targetRef);
      }
      if (element.flowElements) {
        this.flowTargets(element, targets);
      }
    }
    return targets;
  }
}

export default defineRule(
  { ruleName: 'c7-link-event', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7LinkEvent,
);
