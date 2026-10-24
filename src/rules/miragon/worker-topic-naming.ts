import { is, isAny } from 'bpmnlint-utils';

import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';
import { isExpression, ValueNamingScheme } from '../../lib/naming';
import type { ValueNamingConfig } from '../../lib/naming';
import { defineRule } from '../../lib/utils/defineRule';

const EXTERNAL_TASK_TYPES = ['bpmn:ServiceTask', 'bpmn:BusinessRuleTask', 'bpmn:SendTask'];

const EXTERNAL_TASK_NAMESPACES = ['camunda', 'operaton'];

/**
 * Reports a worker topic that does not follow the project's naming scheme: the topic of a
 * Camunda 7 / Operaton external task, or the job type of a Camunda 8 task definition.
 *
 * Both are the same contract under two engine names: the worker subscribes to exactly this
 * string. A scheme such as `billing.validateInvoice` says which service owns the work and what it
 * does, and lets a tool that creates BPMN produce a topic that passes.
 *
 * Configuration (all optional):
 *
 *     "@miragon/rules/worker-topic-naming": [ "error", {
 *       "prefix": "billing",     // fixed lead, followed by the separator
 *       "separator": ".",        // joins the prefix and every segment
 *       "case": "camelCase",     // camelCase, PascalCase, snake_case, kebab-case or any
 *       "segments": 1            // exact number of segments after the prefix
 *     } ]
 *
 * Without `segments` one or more segments pass. A missing topic is a deploy error, not a naming
 * finding, and an expression (`=…`, `${…}`, `#{…}`) is only known at runtime: neither is reported.
 * The rule reads only `camunda:`, `operaton:` and `zeebe:` attributes, so it cannot fire on a
 * diagram without workers.
 */
class WorkerTopicNaming implements Rule {
  private readonly scheme: ValueNamingScheme;

  constructor(config?: ValueNamingConfig) {
    this.scheme = new ValueNamingScheme(config);
  }

  check(node: ModdleElement, reporter: Reporter): void {
    for (const topic of this.workerTopicsOf(node)) {
      if (!this.scheme.matches(topic)) {
        reporter.report(node.id, `Worker topic <${topic}> must match ${this.scheme.describe()}`);
      }
    }
  }

  private workerTopicsOf(node: ModdleElement): string[] {
    const topics = [
      ...this.externalTaskImplementationsOf(node).map((implementation) =>
        this.externalTaskTopicOf(implementation),
      ),
      this.jobTypeOf(node),
    ];

    return topics.filter((topic): topic is string => Boolean(topic) && !isExpression(topic!));
  }

  /** A task implements itself; an event is implemented by its message event definitions. */
  private externalTaskImplementationsOf(node: ModdleElement): ModdleElement[] {
    if (isAny(node, EXTERNAL_TASK_TYPES)) {
      return [node];
    }

    if (!is(node, 'bpmn:Event')) {
      return [];
    }

    const definitions: ModdleElement[] = node.eventDefinitions ?? [];
    return definitions.filter((definition) => is(definition, 'bpmn:MessageEventDefinition'));
  }

  /** The topic of a Camunda 7 / Operaton external task implementation, if this is one. */
  private externalTaskTopicOf(implementation: ModdleElement): string | undefined {
    const namespace = EXTERNAL_TASK_NAMESPACES.find(
      (candidate) => implementation.get(`${candidate}:type`) === 'external',
    );

    return namespace && implementation.get(`${namespace}:topic`);
  }

  /**
   * The Camunda 8 job type from `<zeebe:taskDefinition type="…">`. Read both with the Zeebe moddle
   * extension (`zeebe:TaskDefinition`) and without it, where the element stays generic.
   */
  private jobTypeOf(node: ModdleElement): string | undefined {
    const extensions: ModdleElement[] = node.extensionElements?.values ?? [];
    const taskDefinition = extensions.find(
      (extension) => extension.$type?.toLowerCase() === 'zeebe:taskdefinition',
    );

    return taskDefinition?.type ?? taskDefinition?.$attrs?.type;
  }
}

export default defineRule({ ruleName: 'worker-topic-naming', kind: 'scheme' }, WorkerTopicNaming);
