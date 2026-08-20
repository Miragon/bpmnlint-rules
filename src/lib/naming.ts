/**
 * Naming helpers: what a technical ID should look like, and how to tell a human-authored ID
 * from one a modeler or an agent generated.
 */
import { is } from 'bpmnlint-utils';

import type { ModdleElement } from './moddle';

export type PrefixMap = Record<string, string | false | null>;

/**
 * The shipped convention: a camelCase element-type prefix plus a PascalCase name, e.g.
 * `serviceTask_ClaimMembership`, `gateway_HasEmptySpots`, `flow_ClaimToGateway`.
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
