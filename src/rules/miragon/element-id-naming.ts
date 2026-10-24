import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';
import { ElementIdConvention } from '../../lib/naming';
import type { ElementIdNamingConfig } from '../../lib/naming';
import { defineRule } from '../../lib/utils/defineRule';

/**
 * Reports an element whose ID does not follow the project's naming convention.
 *
 * An element ID is not an implementation detail. It is what the generated code references, what
 * a reviewer reads in a diff, and what the next agent uses to talk about the model. A
 * convention makes all three legible: `serviceTask_claimMembership` says what the element is
 * and what it does; `Activity_0049ryx` says neither.
 *
 * Configuration (all optional):
 *
 *     "@miragon/rules/element-id-naming": [ "error", {
 *       "prefixes": { "bpmn:SequenceFlow": "Flow_", "bpmn:ScriptTask": false },
 *       "case": "PascalCase",
 *       "eventDefinitionQualifier": "optional"
 *     } ]
 *
 * `prefixes` is merged over the defaults, so you only state what differs. `false` switches a
 * type off. `case` is one of `camelCase` (default), `PascalCase`, `snake_case`,
 * `kebab-case` or `any`.
 *
 * `eventDefinitionQualifier` (default `optional`) controls whether an event id may name its event
 * definition: `optional` accepts both `startEvent_` and `messageStartEvent_` on a message start
 * event; `required` accepts only the qualified form; `off` restores one-prefix-per-type. The
 * accepted qualifier is derived from the element's own definitions, so `timerStartEvent_` on a
 * message start event is reported.
 *
 * Element types that are not configured are not checked — an exotic BPMN type nobody thought
 * about must not produce a report.
 */
class ElementIdNaming implements Rule {
  private readonly convention: ElementIdConvention;

  constructor(config?: ElementIdNamingConfig) {
    this.convention = new ElementIdConvention(config);
  }

  check(node: ModdleElement, reporter: Reporter): void {
    const violation = this.convention.violationOf(node);

    if (violation) {
      reporter.report(node.id, violation);
    }
  }
}

export default defineRule({ ruleName: 'element-id-naming', kind: 'convention' }, ElementIdNaming);
