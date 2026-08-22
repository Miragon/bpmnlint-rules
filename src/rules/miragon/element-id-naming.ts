import {
  DEFAULT_PREFIXES,
  acceptedPrefixes,
  detectLyingQualifier,
  resolveCase,
  resolvePrefix,
  resolveQualifierMode,
} from '../../lib/naming';
import type { PrefixMap, QualifierMode } from '../../lib/naming';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

export interface ElementIdNamingConfig {
  prefixes?: PrefixMap;
  case?: string;
  eventDefinitionQualifier?: QualifierMode;
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
 *       "case": "PascalCase",
 *       "eventDefinitionQualifier": "optional"
 *     } ]
 *
 * `prefixes` is merged over the defaults, so you only state what differs. `false` switches a
 * type off. `case` is one of `camelCase` (default), `PascalCase`, `snake_case` or `any`.
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
export default function elementIdNaming(config?: ElementIdNamingConfig): Rule {
  const { prefixes: overrides = {}, case: caseName = 'camelCase' } = config ?? {};

  const prefixes = { ...DEFAULT_PREFIXES, ...overrides };
  const { pattern, label: caseLabel } = resolveCase(caseName);
  const mode = resolveQualifierMode(config?.eventDefinitionQualifier);

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
    const accepted = acceptedPrefixes(node, prefix, mode);

    const matches = (candidate: string): boolean =>
      node.id.startsWith(candidate) && pattern.test(node.id.slice(candidate.length));

    if (accepted.some(matches)) {
      return;
    }

    // A truthful qualifier passes above; an id that *claims* a definition the element does not
    // have gets a message that points straight at the lie.
    const lie = mode !== 'off' ? detectLyingQualifier(node, prefix) : null;

    if (lie) {
      reporter.report(
        node.id,
        `Element id claims a ${lie} event, but this element has no ${lie} event definition`,
      );
      return;
    }

    const conventions = accepted.map((candidate) => `<${candidate}${caseLabel}>`).join(' or ');
    reporter.report(node.id, `Element id must match the naming convention ${conventions}`);
  }

  return { check };
}
