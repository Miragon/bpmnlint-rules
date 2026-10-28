/**
 * `@miragon/bpmnlint-plugin-rules/camunda-7`: camunda-compat's Camunda 7 rules on their own, for a
 * host that loads one engine on demand and runs them with its own rules through `lint` of
 * `./engine`. It bundles camunda-compat's `camunda-platform-7-*` configs and their rules, and none of the
 * other engine's.
 */
import startEventRequired from 'bpmnlint/rules/start-event-required.js';

import * as compat from './rules/camunda-7/versions';
import { EngineLayer } from './config/EngineLayer';
import type { RuleEntry } from './resolver/SinglePassLinter';

const layer = new EngineLayer(compat);
const factories = {
  ...compat.resolverEntries,
  'rule:bpmnlint/start-event-required': startEventRequired,
};

/** camunda-compat's rules for the engine `version` (the latest when omitted), freshly built. */
export const compatRules: (version?: string) => RuleEntry[] = layer.rules.bind(layer, factories);

/** The moddle extension camunda-compat's rules read, to parse a diagram with. */
export const moddleExtensions = layer.config().moddleExtensions;
