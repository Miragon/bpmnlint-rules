import { is } from 'bpmnlint-utils';

import type { ModdleElement } from '../moddle';
import { resolveCase } from './utils/cases';
import type { CaseSpec } from './utils/cases';
import { eventQualifiers, qualify } from './utils/eventQualifiers';

export type PrefixMap = Record<string, string | false | null>;

/**
 * How aggressively an element's event definition may (or must) qualify its type prefix.
 *
 * `off`      — one prefix per type, exactly as before.
 * `optional` — the plain prefix *and* an event-definition-qualified form are both accepted, e.g.
 *              `startEvent_` and `messageStartEvent_` on a message start event.
 * `required` — only the qualified form(s) are accepted, falling back to the plain prefix for an
 *              element that carries no event definition at all.
 */
export type QualifierMode = 'off' | 'optional' | 'required';

export interface ElementIdNamingConfig {
  prefixes?: PrefixMap;
  case?: string;
  eventDefinitionQualifier?: QualifierMode;
}

/**
 * The shipped convention: a camelCase element-type prefix plus a camelCase name, e.g.
 * `serviceTask_claimMembership`, `gateway_hasEmptySpots`, `flow_claimToGateway`.
 *
 * `bpmn:Process` is deliberately absent. A process ID is a public contract — the deployment
 * key, and what a call activity references — not a diagram-internal identifier, so projects
 * legitimately name it after the business process rather than after its BPMN type.
 */
export const DEFAULT_PREFIXES: PrefixMap = {
  'bpmn:StartEvent': 'startEvent_',
  'bpmn:EndEvent': 'endEvent_',
  'bpmn:BoundaryEvent': 'event_',
  'bpmn:IntermediateCatchEvent': 'event_',
  'bpmn:IntermediateThrowEvent': 'event_',
  'bpmn:ServiceTask': 'serviceTask_',
  'bpmn:UserTask': 'userTask_',
  'bpmn:SendTask': 'sendTask_',
  'bpmn:ReceiveTask': 'receiveTask_',
  'bpmn:ManualTask': 'manualTask_',
  'bpmn:ScriptTask': 'scriptTask_',
  'bpmn:BusinessRuleTask': 'businessRuleTask_',
  'bpmn:Task': 'task_',
  'bpmn:CallActivity': 'callActivity_',
  'bpmn:SubProcess': 'subProcess_',
  'bpmn:Gateway': 'gateway_',
  'bpmn:SequenceFlow': 'flow_',
};

/**
 * Base types tried — most specific first — when an element's exact `$type` is not configured.
 * This is what makes `bpmn:Transaction` and `bpmn:AdHocSubProcess` inherit the sub-process
 * convention, and every gateway kind inherit `bpmn:Gateway`.
 *
 * Order matters only between a type and its ancestors: `bpmn:Task` must come after the concrete
 * task types, `bpmn:Gateway` after the concrete gateways.
 */
const FALLBACK_ORDER = [
  'bpmn:BoundaryEvent',
  'bpmn:StartEvent',
  'bpmn:EndEvent',
  'bpmn:IntermediateCatchEvent',
  'bpmn:IntermediateThrowEvent',
  'bpmn:ServiceTask',
  'bpmn:UserTask',
  'bpmn:SendTask',
  'bpmn:ReceiveTask',
  'bpmn:ManualTask',
  'bpmn:ScriptTask',
  'bpmn:BusinessRuleTask',
  'bpmn:CallActivity',
  'bpmn:SubProcess',
  'bpmn:Task',
  'bpmn:ExclusiveGateway',
  'bpmn:ParallelGateway',
  'bpmn:InclusiveGateway',
  'bpmn:EventBasedGateway',
  'bpmn:ComplexGateway',
  'bpmn:Gateway',
  'bpmn:SequenceFlow',
];

const QUALIFIER_MODES = new Set<QualifierMode>(['off', 'optional', 'required']);

/**
 * The event-definition qualifiers BPMN knows. Used only to *detect a lie* — an id that claims,
 * say, a timer event on an element that has no timer definition. The set of qualifiers actually
 * accepted for an element is derived from its own definitions, not from this list.
 */
const KNOWN_EVENT_QUALIFIERS = [
  'message',
  'timer',
  'signal',
  'conditional',
  'escalation',
  'error',
  'link',
  'terminate',
  'compensate',
];

/**
 * What a technical element ID should look like — a type prefix, optionally qualified by the
 * element's event definition, followed by a name in the configured case — and why a given ID
 * breaks it.
 */
export class ElementIdConvention {
  private readonly prefixes: PrefixMap;
  private readonly namingCase: CaseSpec;
  private readonly qualifierMode: QualifierMode;

  constructor(config?: ElementIdNamingConfig) {
    const { prefixes: overrides = {}, case: caseName = 'camelCase' } = config ?? {};
    const mode = config?.eventDefinitionQualifier;

    this.prefixes = { ...DEFAULT_PREFIXES, ...overrides };
    this.namingCase = resolveCase(caseName);
    this.qualifierMode = mode !== undefined && QUALIFIER_MODES.has(mode) ? mode : 'optional';
  }

  /**
   * The reason this element's id breaks the convention, or `null` when it follows it — or is not
   * checked at all (no id, or a type without a prefix). An id that claims an event definition the
   * element lacks gets a message naming that lie.
   */
  violationOf(node: ModdleElement): string | null {
    // Elements without an ID are `no-bpmndi`'s / the engine's problem, not this check's.
    if (!node.id) {
      return null;
    }

    const prefix = this.prefixOf(node);

    if (!prefix) {
      return null;
    }

    const accepted = this.acceptedPrefixes(node, prefix);
    const matches = (candidate: string): boolean =>
      node.id.startsWith(candidate) &&
      this.namingCase.pattern.test(node.id.slice(candidate.length));

    if (accepted.some(matches)) {
      return null;
    }

    const lie = this.qualifierMode !== 'off' ? this.lyingQualifier(node, prefix) : null;

    if (lie) {
      return `Element id claims a ${lie} event, but this element has no ${lie} event definition`;
    }

    const conventions = accepted
      .map((candidate) => `<${candidate}${this.namingCase.label}>`)
      .join(' or ');
    return `Element id must match the naming convention ${conventions}`;
  }

  /**
   * The prefix configured for this element: exact `$type` first, then inheritance over
   * `FALLBACK_ORDER`. An element whose type is not configured at all — or switched off with an
   * explicit `false`/`null` — gets `null`, which keeps a BPMN type nobody thought about from
   * producing a spurious report.
   */
  private prefixOf(node: ModdleElement): string | null {
    const configured = (type: string): boolean =>
      Object.prototype.hasOwnProperty.call(this.prefixes, type);
    const type = configured(node.$type)
      ? node.$type
      : FALLBACK_ORDER.find((fallback) => configured(fallback) && is(node, fallback));

    return (type && this.prefixes[type]) || null;
  }

  /**
   * Every prefix that is acceptable for this element. The set is built from the element's *own*
   * event definitions, so a qualifier that does not match a definition is simply never in it.
   * Qualifiers name an *event* definition, so they only apply to `bpmn:Event`s.
   */
  private acceptedPrefixes(node: ModdleElement, prefix: string): string[] {
    if (this.qualifierMode === 'off' || !is(node, 'bpmn:Event')) {
      return [prefix];
    }

    const qualified = eventQualifiers(node).map((qualifier) => qualify(qualifier, prefix));

    if (this.qualifierMode === 'required') {
      return qualified.length ? [...new Set(qualified)] : [prefix];
    }

    return [...new Set([prefix, ...qualified])];
  }

  /**
   * The event qualifier this id *claims* but the element does not have: `timerStartEvent_…` on a
   * message start event returns `'timer'`. Only `bpmn:Event`s can lie about a qualifier — a task
   * whose id merely starts with a qualifier word is never flagged as one.
   */
  private lyingQualifier(node: ModdleElement, prefix: string): string | null {
    if (!is(node, 'bpmn:Event')) {
      return null;
    }

    const actual = new Set(eventQualifiers(node));
    const lie = KNOWN_EVENT_QUALIFIERS.find(
      (qualifier) => !actual.has(qualifier) && node.id.startsWith(qualify(qualifier, prefix)),
    );

    return lie ?? null;
  }
}
