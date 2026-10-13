/**
 * The structural base — bpmnlint's own built-in rules and configs (`bpmnlint:recommended` and
 * friends), the layer identical for every engine.
 *
 * bpmnlint resolves a rule by a dynamic require-path string a bundler cannot follow, so — exactly
 * as the modeler's old `builtinResolver` did — every built-in rule and config is a *static* import
 * here, and `resolverEntries` maps each to the `rule:`/`config:` cache key bpmnlint asks for. The
 * whole point is that a consumer needs no `bpmnlint` install of its own: the rules are bundled.
 * Each import names the file with its `.js` extension: bpmnlint has no `exports` map, so Node's
 * ESM resolver needs the full path.
 */
import type { ResolverEntries } from '../../lib/bpmnlint-config';

import recommended from 'bpmnlint/config/recommended.js';
import all from 'bpmnlint/config/all.js';
import correctness from 'bpmnlint/config/correctness.js';

import adHocSubProcess from 'bpmnlint/rules/ad-hoc-sub-process.js';
import conditionalEvent from 'bpmnlint/rules/conditional-event.js';
import conditionalFlows from 'bpmnlint/rules/conditional-flows.js';
import endEventRequired from 'bpmnlint/rules/end-event-required.js';
import eventBasedGateway from 'bpmnlint/rules/event-based-gateway.js';
import eventSubProcessTypedStartEvent from 'bpmnlint/rules/event-sub-process-typed-start-event.js';
import fakeJoin from 'bpmnlint/rules/fake-join.js';
import globalRule from 'bpmnlint/rules/global.js';
import labelRequired from 'bpmnlint/rules/label-required.js';
import linkEvent from 'bpmnlint/rules/link-event.js';
import noBpmndi from 'bpmnlint/rules/no-bpmndi.js';
import noComplexGateway from 'bpmnlint/rules/no-complex-gateway.js';
import noDisconnected from 'bpmnlint/rules/no-disconnected.js';
import noDuplicateSequenceFlows from 'bpmnlint/rules/no-duplicate-sequence-flows.js';
import noGatewayJoinFork from 'bpmnlint/rules/no-gateway-join-fork.js';
import noImplicitEnd from 'bpmnlint/rules/no-implicit-end.js';
import noImplicitSplit from 'bpmnlint/rules/no-implicit-split.js';
import noImplicitStart from 'bpmnlint/rules/no-implicit-start.js';
import noInclusiveGateway from 'bpmnlint/rules/no-inclusive-gateway.js';
import noOverlappingElements from 'bpmnlint/rules/no-overlapping-elements.js';
import singleBlankStartEvent from 'bpmnlint/rules/single-blank-start-event.js';
import singleEventDefinition from 'bpmnlint/rules/single-event-definition.js';
import standardSize from 'bpmnlint/rules/standard-size.js';
import startEventRequired from 'bpmnlint/rules/start-event-required.js';
import subProcessBlankStartEvent from 'bpmnlint/rules/sub-process-blank-start-event.js';
import superfluousGateway from 'bpmnlint/rules/superfluous-gateway.js';
import superfluousLabel from 'bpmnlint/rules/superfluous-label.js';
import superfluousTermination from 'bpmnlint/rules/superfluous-termination.js';

/** The `extends` entry a config uses to pull in the structural base. */
export const extendsLayer = 'bpmnlint:recommended';

/** The shared generic BPMN correctness rule-set (bpmnlint's own `recommended`). */
export const commonRules = recommended;

export const resolverEntries: ResolverEntries = {
  'config:bpmnlint/recommended': recommended,
  'config:bpmnlint/all': all,
  'config:bpmnlint/correctness': correctness,
  'rule:bpmnlint/ad-hoc-sub-process': adHocSubProcess,
  'rule:bpmnlint/conditional-event': conditionalEvent,
  'rule:bpmnlint/conditional-flows': conditionalFlows,
  'rule:bpmnlint/end-event-required': endEventRequired,
  'rule:bpmnlint/event-based-gateway': eventBasedGateway,
  'rule:bpmnlint/event-sub-process-typed-start-event': eventSubProcessTypedStartEvent,
  'rule:bpmnlint/fake-join': fakeJoin,
  'rule:bpmnlint/global': globalRule,
  'rule:bpmnlint/label-required': labelRequired,
  'rule:bpmnlint/link-event': linkEvent,
  'rule:bpmnlint/no-bpmndi': noBpmndi,
  'rule:bpmnlint/no-complex-gateway': noComplexGateway,
  'rule:bpmnlint/no-disconnected': noDisconnected,
  'rule:bpmnlint/no-duplicate-sequence-flows': noDuplicateSequenceFlows,
  'rule:bpmnlint/no-gateway-join-fork': noGatewayJoinFork,
  'rule:bpmnlint/no-implicit-end': noImplicitEnd,
  'rule:bpmnlint/no-implicit-split': noImplicitSplit,
  'rule:bpmnlint/no-implicit-start': noImplicitStart,
  'rule:bpmnlint/no-inclusive-gateway': noInclusiveGateway,
  'rule:bpmnlint/no-overlapping-elements': noOverlappingElements,
  'rule:bpmnlint/single-blank-start-event': singleBlankStartEvent,
  'rule:bpmnlint/single-event-definition': singleEventDefinition,
  'rule:bpmnlint/standard-size': standardSize,
  'rule:bpmnlint/start-event-required': startEventRequired,
  'rule:bpmnlint/sub-process-blank-start-event': subProcessBlankStartEvent,
  'rule:bpmnlint/superfluous-gateway': superfluousGateway,
  'rule:bpmnlint/superfluous-label': superfluousLabel,
  'rule:bpmnlint/superfluous-termination': superfluousTermination,
};
