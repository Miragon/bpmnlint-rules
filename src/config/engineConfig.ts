/**
 * Builds bpmnlint configs from the rule-set folders — the library form of the modeler's old
 * `DefaultBpmnlintConfigService`.
 *
 * The zero-config default is layered, mirroring Camunda's `@camunda/linting`:
 *  - `bpmnlint:recommended` — shared generic BPMN correctness, identical for every engine;
 *  - `plugin:@miragon/rules/recommended` — the thin Miragon opinion layer (see `rules/miragon`);
 *  - `plugin:camunda-compat/<platform-version>` — the engine deployability matrix, added **only**
 *    when an engine is given. An engine-less document gets the structural base alone.
 *
 * The engine layer's moddle descriptor is embedded directly (not referenced by module path) so a
 * config-less host can still parse the typed `zeebe:`/`camunda:` properties those rules inspect.
 */
import type { BpmnlintConfig } from '../lib/bpmnlint-config';

import { extendsLayer as structuralLayer, commonRules } from '../rules/common';
import { MIRAGON_NAME } from '../rules/miragon';
import * as camunda7 from '../rules/camunda-7';
import * as camunda8 from '../rules/camunda-8';

/** A supported execution platform. `undefined` selects the structural base only. */
export type Engine = 'c7' | 'c8';

/** The Miragon opinion layer, referenced by name (resolved from the bundled resolver). */
const MIRAGON_LAYER = `plugin:${MIRAGON_NAME}/recommended`;

const BASE_EXTENDS = [structuralLayer, MIRAGON_LAYER];

export interface DefaultLintConfigOptions {
  engine?: Engine;
}

/**
 * The zero-config default config for a host with no `.bpmnlintrc`: structural base + Miragon
 * opinion, plus the matching Camunda engine layer and moddle extension when `engine` is given.
 */
export function getDefaultLintConfig(options: DefaultLintConfigOptions = {}): BpmnlintConfig {
  switch (options.engine) {
    case 'c7':
      return {
        extends: [...BASE_EXTENDS, camunda7.extendsLayer],
        moddleExtensions: {
          [camunda7.moddleExtension.prefix]: camunda7.moddleExtension.descriptor,
        },
      };
    case 'c8':
      return {
        extends: [...BASE_EXTENDS, camunda8.extendsLayer],
        moddleExtensions: {
          [camunda8.moddleExtension.prefix]: camunda8.moddleExtension.descriptor,
        },
      };
    default:
      return { extends: [...BASE_EXTENDS] };
  }
}

/**
 * The deployability rule-set for an engine (the camunda-compat shareable config), or the shared
 * structural rule-set when no engine is given.
 */
export function getRulesForEngine(engine?: Engine): unknown {
  switch (engine) {
    case 'c7':
      return camunda7.camunda7Rules;
    case 'c8':
      return camunda8.camunda8Rules;
    default:
      return commonRules;
  }
}
