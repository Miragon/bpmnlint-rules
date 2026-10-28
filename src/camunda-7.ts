/**
 * `@miragon/bpmnlint-plugin-rules/camunda-7`: the Camunda 7 engine lint on its own, for a host that
 * loads one engine on demand and checks the structure itself. It bundles camunda-compat's
 * `camunda-platform-7-*` configs and their rules plus the Miragon Camunda 7 rules, and none of
 * the other engine's.
 */
import startEventRequired from 'bpmnlint/rules/start-event-required.js';

import * as compat from './rules/camunda-7';
import { EngineLayer } from './config/EngineLayer';
import { camunda7Layer, resolverEntries as miragonEntries } from './rules/miragon/camunda-7';
import { EngineLint } from './resolver/EngineLint';

export const camunda7 = new EngineLint(
  new EngineLayer({ engine: 'c7', ...compat, miragonLayer: camunda7Layer }),
  {
    ...compat.resolverEntries,
    ...miragonEntries,
    'rule:bpmnlint/start-event-required': startEventRequired,
  },
);
