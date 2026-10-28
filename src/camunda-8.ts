/**
 * `@miragon/bpmnlint-plugin-rules/camunda-8`: the Camunda 8 engine lint on its own, for a host that
 * loads one engine on demand and checks the structure itself. It bundles camunda-compat's
 * `camunda-cloud-8-*` configs and their rules plus the Miragon Camunda 8 rules, and none of
 * the other engine's.
 */
import startEventRequired from 'bpmnlint/rules/start-event-required.js';

import * as compat from './rules/camunda-8';
import { EngineLayer } from './config/EngineLayer';
import { camunda8Layer, resolverEntries as miragonEntries } from './rules/miragon/camunda-8';
import { EngineLint } from './resolver/EngineLint';

export const camunda8 = new EngineLint(
  new EngineLayer({ engine: 'c8', ...compat, miragonLayer: camunda8Layer }),
  {
    ...compat.resolverEntries,
    ...miragonEntries,
    'rule:bpmnlint/start-event-required': startEventRequired,
  },
);
