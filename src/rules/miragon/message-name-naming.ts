import { is } from 'bpmnlint-utils';

import { describeValueNaming, matchesValueNaming, resolveValueNaming } from '../../lib/naming';
import type { ValueNamingConfig } from '../../lib/naming';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

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
 *       "prefix": "billing",
 *       "separator": ".",
 *       "case": "camelCase"
 *     } ]
 *
 * After the optional `prefix` the name is one or more segments joined by `separator`, each in
 * `case`: `camelCase` (default), `PascalCase`, `snake_case`, `kebab-case` or `any`.
 *
 * A message without a name is the engine's problem, not a naming finding, and stays unreported.
 */
export default function messageNameNaming(config?: ValueNamingConfig): Rule {
  const scheme = resolveValueNaming(config);
  const message = `Message name must match the naming convention <${describeValueNaming(scheme)}>`;

  function check(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:Message') || !node.name) {
      return;
    }

    if (!matchesValueNaming(node.name, scheme)) {
      reporter.report(node.id, message);
    }
  }

  return { check };
}

messageNameNaming.ruleName = 'message-name-naming' as const;
