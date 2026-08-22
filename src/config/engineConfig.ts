/**
 * Builds bpmnlint configs from the rule-set folders — the library form of the modeler's old
 * `DefaultBpmnlintConfigService`.
 *
 * The zero-config default is layered, mirroring Camunda's `@camunda/linting`:
 *  - `bpmnlint:recommended` — shared generic BPMN correctness, identical for every engine;
 *  - the Miragon opinion layer (see `rules/miragon`), chosen by `preset`: a *modeling* diagram
 *    (`recommended-for-modeling`, layout hints only, safe on hand-drawn diagrams) or *automation*
 *    (`recommended-for-automation`, every Miragon rule at `error`). When `preset` is omitted it is
 *    derived from `engine` for backwards compatibility — an engine-bound document defaults to
 *    automation, an engine-less one to modeling;
 *  - `plugin:camunda-compat/<platform-version>` — the engine deployability matrix, added **only**
 *    when an engine is given, *independently* of the preset. This lets a modeler ask for the
 *    engine's typed moddle + deployability rules while keeping the relaxed modeling opinion layer.
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

/**
 * The Miragon opinion layer to apply, decoupled from the engine:
 *  - `modeling` — layout hints only, safe on hand-drawn diagrams;
 *  - `automation` — every Miragon rule at `error`, the execution-ready bar.
 */
export type Preset = 'modeling' | 'automation';

/** The Miragon opinion layers, referenced by name (resolved from the bundled resolver). */
const MIRAGON_LAYER_MODELING = `plugin:${MIRAGON_NAME}/recommended-for-modeling`;
const MIRAGON_LAYER_AUTOMATION = `plugin:${MIRAGON_NAME}/recommended-for-automation`;

const MIRAGON_LAYER: Record<Preset, string> = {
  modeling: MIRAGON_LAYER_MODELING,
  automation: MIRAGON_LAYER_AUTOMATION,
};

export interface DefaultLintConfigOptions {
  /**
   * The execution platform whose deployability layer + typed moddle to add. Omit for the
   * structural + Miragon base alone.
   */
  engine?: Engine;
  /**
   * The Miragon opinion layer. Defaults to `automation` when an `engine` is given and `modeling`
   * otherwise — pass it explicitly to decouple the two, e.g. a modeler wanting the engine's typed
   * moddle and deployability rules but the relaxed modeling opinion layer.
   */
  preset?: Preset;
}

/**
 * The zero-config default config for a host with no `.bpmnlintrc`: structural base + Miragon
 * opinion, plus the matching Camunda engine layer and moddle extension when `engine` is given.
 */
export function getDefaultLintConfig(options: DefaultLintConfigOptions = {}): BpmnlintConfig {
  const { engine } = options;
  const preset: Preset = options.preset ?? (engine ? 'automation' : 'modeling');

  const base = [structuralLayer, MIRAGON_LAYER[preset]];

  switch (engine) {
    case 'c7':
      return {
        extends: [...base, camunda7.extendsLayer],
        moddleExtensions: {
          [camunda7.moddleExtension.prefix]: camunda7.moddleExtension.descriptor,
        },
      };
    case 'c8':
      return {
        extends: [...base, camunda8.extendsLayer],
        moddleExtensions: {
          [camunda8.moddleExtension.prefix]: camunda8.moddleExtension.descriptor,
        },
      };
    default:
      return { extends: base };
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
