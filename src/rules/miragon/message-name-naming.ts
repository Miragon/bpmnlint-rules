import { is } from 'bpmnlint-utils';

import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';
import { isExpression, ValueNamingScheme } from '../../lib/naming';
import type { ValueNamingConfig } from '../../lib/naming';
import { defineRule } from '../../lib/utils/defineRule';

/**
 * Reports a message whose name does not follow the project's naming scheme.
 *
 * A message name is a contract: the engine correlates an incoming message by exactly this string,
 * and every sender has to spell it the same way. A scheme such as `billing.paymentReceived` says
 * which domain owns the message, and lets a tool that creates BPMN produce a name that passes.
 *
 * Configuration (all optional):
 *
 *     "@miragon/rules/message-name-naming": [ "error", {
 *       "prefix": "billing",     // fixed lead, followed by the separator
 *       "separator": ".",        // joins the prefix and every segment
 *       "case": "camelCase",     // camelCase, PascalCase, snake_case, kebab-case or any
 *       "segments": 1            // exact number of segments after the prefix
 *     } ]
 *
 * Without `segments` one or more segments pass. A message without a name is the engine's
 * problem, not a naming finding, and an expression (`=…`, `${…}`, `#{…}`) is only known at
 * runtime: neither is reported.
 */
class MessageNameNaming implements Rule {
  private readonly scheme: ValueNamingScheme;

  constructor(config?: ValueNamingConfig) {
    this.scheme = new ValueNamingScheme(config);
  }

  check(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:Message') || !node.name || isExpression(node.name)) {
      return;
    }

    if (!this.scheme.matches(node.name)) {
      reporter.report(node.id, `Message name <${node.name}> must match ${this.scheme.describe()}`);
    }
  }
}

export default defineRule({ ruleName: 'message-name-naming', kind: 'scheme' }, MessageNameNaming);
