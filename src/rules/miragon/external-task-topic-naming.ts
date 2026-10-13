import { is, isAny } from 'bpmnlint-utils';

import { describeValueNaming, matchesValueNaming, resolveValueNaming } from '../../lib/naming';
import type { ValueNamingConfig } from '../../lib/naming';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

const EXTERNAL_TASK_TYPES = ['bpmn:ServiceTask', 'bpmn:BusinessRuleTask', 'bpmn:SendTask'];

const ENGINE_NAMESPACES = ['camunda', 'operaton'];

/** The topic of an external task implementation, or `undefined` when the element is not one. */
function externalTaskTopic(implementation: ModdleElement): string | undefined {
  const namespace = ENGINE_NAMESPACES.find(
    (candidate) => implementation.get(`${candidate}:type`) === 'external',
  );

  return namespace && implementation.get(`${namespace}:topic`);
}

/** A task implements itself; an event is implemented by its message event definitions. */
function implementationsOf(node: ModdleElement): ModdleElement[] {
  if (isAny(node, EXTERNAL_TASK_TYPES)) {
    return [node];
  }

  if (!is(node, 'bpmn:Event')) {
    return [];
  }

  const definitions: ModdleElement[] = node.eventDefinitions ?? [];
  return definitions.filter((definition) => is(definition, 'bpmn:MessageEventDefinition'));
}

/**
 * Reports an external task whose topic does not follow the project's naming scheme.
 *
 * A topic is a contract: the worker subscribes to exactly this string. A scheme such as
 * `billing.validateInvoice` says which domain owns the work and what it does, and lets a tool
 * that creates BPMN produce a topic that passes.
 *
 * Configuration (all optional):
 *
 *     "@miragon/rules/external-task-topic-naming": [ "error", {
 *       "prefix": "billing",
 *       "separator": ".",
 *       "case": "camelCase"
 *     } ]
 *
 * After the optional `prefix` the topic is one or more segments joined by `separator`, each in
 * `case`: `camelCase` (default), `PascalCase`, `snake_case`, `kebab-case` or `any`.
 *
 * Applies to a service, business rule or send task, and to the message event definition of an
 * event, with `camunda:type="external"` or `operaton:type="external"`. An external task without a
 * topic is a deploy error, not a naming finding, and stays unreported here.
 */
export default function externalTaskTopicNaming(config?: ValueNamingConfig): Rule {
  const scheme = resolveValueNaming(config);
  const message = `External task topic must match the naming convention <${describeValueNaming(scheme)}>`;

  function check(node: ModdleElement, reporter: Reporter): void {
    const offTheScheme = implementationsOf(node)
      .map(externalTaskTopic)
      .some((topic) => topic && !matchesValueNaming(topic, scheme));

    if (offTheScheme) {
      reporter.report(node.id, message);
    }
  }

  return { check };
}

externalTaskTopicNaming.ruleName = 'external-task-topic-naming' as const;
