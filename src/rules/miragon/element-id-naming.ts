import { DEFAULT_PREFIXES, resolveCase, resolvePrefix } from '../../lib/naming';
import type { PrefixMap } from '../../lib/naming';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

export interface ElementIdNamingConfig {
  prefixes?: PrefixMap;
  case?: string;
}

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
 *     "miragon/element-id-naming": [ "error", {
 *       "prefixes": { "bpmn:SequenceFlow": "Flow_", "bpmn:ScriptTask": false },
 *       "case": "PascalCase"
 *     } ]
 *
 * `prefixes` is merged over the defaults, so you only state what differs. `false` switches a
 * type off. `case` is one of `camelCase` (default), `PascalCase`, `snake_case` or `any`.
 *
 * Element types that are not configured are not checked — an exotic BPMN type nobody thought
 * about must not produce a report.
 */
export default function elementIdNaming(config?: ElementIdNamingConfig): Rule {
  const { prefixes: overrides = {}, case: caseName = 'camelCase' } = config ?? {};

  const prefixes = { ...DEFAULT_PREFIXES, ...overrides };
  const { pattern, label: caseLabel } = resolveCase(caseName);

  function check(node: ModdleElement, reporter: Reporter): void {
    // Elements without an ID are `no-bpmndi`'s / the engine's problem, not this rule's.
    if (!node.id) {
      return;
    }

    const convention = resolvePrefix(node, prefixes);

    if (!convention) {
      return;
    }

    const { prefix } = convention;

    if (node.id.startsWith(prefix) && pattern.test(node.id.slice(prefix.length))) {
      return;
    }

    reporter.report(node.id, `Element id must match the naming convention <${prefix}${caseLabel}>`);
  }

  return { check };
}
