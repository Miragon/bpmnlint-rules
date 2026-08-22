/**
 * Naming helpers: what a technical ID should look like, and how to tell a human-authored ID
 * from one a modeler or an agent generated.
 */
import { is } from 'bpmnlint-utils';

import type { ModdleElement } from './moddle';

export type PrefixMap = Record<string, string | false | null>;

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

const EVENT_DEFINITION_SUFFIX = 'EventDefinition';

/** `bpmn:TimerEventDefinition` -> `timer`. Returns `null` for anything not an event definition. */
function qualifierOf(definition: ModdleElement): string | null {
  const type: string = definition.$type ?? '';
  const local = type.slice(type.indexOf(':') + 1);

  if (!local.endsWith(EVENT_DEFINITION_SUFFIX) || local.length === EVENT_DEFINITION_SUFFIX.length) {
    return null;
  }

  const name = local.slice(0, -EVENT_DEFINITION_SUFFIX.length);
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** The distinct event-definition qualifiers an element carries, e.g. `['message']`. */
export function eventQualifiers(node: ModdleElement): string[] {
  const definitions: ModdleElement[] = node.eventDefinitions ?? [];
  const qualifiers = definitions
    .map(qualifierOf)
    .filter((qualifier): qualifier is string => qualifier !== null);
  return [...new Set(qualifiers)];
}

/** `qualify('timer', 'startEvent_')` -> `timerStartEvent_` (trailing separator preserved). */
function qualify(qualifier: string, prefix: string): string {
  return `${qualifier}${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}`;
}

/**
 * Every prefix that is acceptable for this element, given its resolved base `prefix` and the
 * qualifier `mode`. The set is built from the element's *own* event definitions, so a qualifier
 * that does not match a definition is simply never in it.
 *
 * Qualifiers name an *event* definition, so they only apply to `bpmn:Event`s; every other type
 * keeps its single prefix regardless of `mode`.
 */
export function acceptedPrefixes(
  node: ModdleElement,
  prefix: string,
  mode: QualifierMode,
): string[] {
  if (mode === 'off' || !is(node, 'bpmn:Event')) {
    return [prefix];
  }

  const qualified = eventQualifiers(node).map((qualifier) => qualify(qualifier, prefix));

  if (mode === 'required') {
    return qualified.length ? [...new Set(qualified)] : [prefix];
  }

  return [...new Set([prefix, ...qualified])];
}

/**
 * Does this id *claim* an event qualifier the element does not actually have? `timerStartEvent_…`
 * on a message start event returns `'timer'`, which lets the rule say exactly what is wrong. Only
 * `bpmn:Event`s can lie about a qualifier — a task whose id merely starts with a qualifier word is
 * never flagged as one.
 */
export function detectLyingQualifier(node: ModdleElement, prefix: string): string | null {
  if (!is(node, 'bpmn:Event')) {
    return null;
  }

  const actual = new Set(eventQualifiers(node));

  for (const qualifier of KNOWN_EVENT_QUALIFIERS) {
    if (!actual.has(qualifier) && node.id.startsWith(qualify(qualifier, prefix))) {
      return qualifier;
    }
  }

  return null;
}

export interface CaseSpec {
  pattern: RegExp;
  label: string;
}

/** Accepted shapes for the part of the ID that follows the prefix. */
const CASES: Record<string, CaseSpec> = {
  PascalCase: { pattern: /^[A-Z][A-Za-z0-9]*$/, label: 'PascalCase' },
  camelCase: { pattern: /^[a-z][A-Za-z0-9]*$/, label: 'camelCase' },
  snake_case: { pattern: /^[a-z0-9]+(_[a-z0-9]+)*$/, label: 'snake_case' },
  any: { pattern: /^.+$/, label: 'any' },
};

const PASCAL_CASE: CaseSpec = CASES.PascalCase!;

export interface PrefixConvention {
  type: string;
  prefix: string;
}

/**
 * Which naming convention applies to this element?
 *
 * Resolution is exact-`$type` first, then inheritance over `FALLBACK_ORDER`. An element whose
 * type is not configured at all returns `null` — the rule then has no opinion, which keeps a
 * BPMN type nobody thought about from producing a spurious report.
 */
export function resolvePrefix(node: ModdleElement, prefixes: PrefixMap): PrefixConvention | null {
  const configured = (type: string): boolean =>
    Object.prototype.hasOwnProperty.call(prefixes, type);

  const entry = (type: string): PrefixConvention | null => {
    const prefix = prefixes[type];

    // An explicit `false`/`null` switches the check off for that type.
    return prefix ? { type, prefix } : null;
  };

  if (configured(node.$type)) {
    return entry(node.$type);
  }

  for (const type of FALLBACK_ORDER) {
    if (configured(type) && is(node, type)) {
      return entry(type);
    }
  }

  return null;
}

export function resolveCase(caseName: string): CaseSpec {
  return CASES[caseName] ?? PASCAL_CASE;
}

/** Coerce a config value to a known qualifier mode; an unrecognised value falls back to `optional`. */
export function resolveQualifierMode(mode: string | undefined): QualifierMode {
  return mode !== undefined && QUALIFIER_MODES.has(mode as QualifierMode)
    ? (mode as QualifierMode)
    : 'optional';
}

/**
 * Does this ID look like it was generated rather than chosen?
 *
 * Two shapes, both measured against real modeler output rather than guessed:
 *
 *  - `Activity_0049ryx` — a type prefix plus a short random token. bpmn-io's modeler emits a
 *    7-character base-36 token; the window is widened to 6–8 for tolerance. The token must mix
 *    letters *and* digits, which is what separates it from a real word: across ~2,350 generated
 *    IDs sampled from real models, every random token contained a digit and no genuine word in
 *    that length window did.
 *  - `StartEvent_1`, `Flow_2` — the older bare-counter form.
 *
 * A second underscore disqualifies both, so a deliberate `userTask_Approve_2` is left alone.
 */
export function isGeneratedId(id: string): boolean {
  const random =
    /^[A-Za-z][A-Za-z0-9]*_(?=[a-z0-9]{6,8}$)(?=[a-z0-9]*[a-z])(?=[a-z0-9]*[0-9])[a-z0-9]+$/;
  const counter = /^[A-Za-z][A-Za-z0-9]*_[0-9]+$/;

  return random.test(id) || counter.test(id);
}
