/**
 * Builds bpmnlint configs from the rule-set folders — the library form of the modeler's old
 * `DefaultBpmnlintConfigService`.
 *
 * The zero-config default is layered, mirroring Camunda's `@camunda/linting`:
 *  - `bpmnlint:recommended` — shared generic BPMN correctness, identical for every engine;
 *  - the Miragon opinion layer (see `rules/miragon`), chosen by `preset`: a *modeling* diagram
 *    (`recommended-for-modeling`, layout hints only, safe on hand-drawn diagrams) or *automation*
 *    (`recommended-for-automation`, engine-agnostic Miragon rules at `warn`). When `preset` is omitted it is
 *    derived from `engine` for backwards compatibility — an engine-bound document defaults to
 *    automation, an engine-less one to modeling;
 *  - `plugin:camunda-compat/<platform-version>` — the engine deployability matrix for the engine
 *    version (the latest when none is given), and `plugin:@miragon/rules/camunda-<n>`, the engine
 *    checks camunda-compat leaves out. Both are added **only** when an engine is given,
 *    *independently* of the preset. This lets a modeler ask for the engine's typed moddle +
 *    deployability rules while keeping the relaxed modeling opinion layer.
 *
 * The engine layer's moddle descriptor is embedded directly (not referenced by module path) so a
 * config-less host can still parse the typed `zeebe:`/`camunda:` properties those rules inspect.
 */
import type { BpmnlintConfig, Engine } from '../lib/bpmnlint-config';

import { extendsLayer as structuralLayer, commonRules } from '../rules/common';
import { MIRAGON_NAME } from '../lib/plugin-names';
import * as camunda7 from '../rules/camunda-7';
import * as camunda8 from '../rules/camunda-8';
import { camunda7Layer } from '../rules/miragon/camunda-7';
import { camunda8Layer } from '../rules/miragon/camunda-8';
import { EngineLayer } from './EngineLayer';

/**
 * The Miragon opinion layer to apply, decoupled from the engine:
 *  - `modeling` — layout hints only, safe on hand-drawn diagrams;
 *  - `automation` — engine-agnostic Miragon rules at a non-blocking `warn`.
 */
export type Preset = 'modeling' | 'automation';

/** The Miragon opinion layers, referenced by name (resolved from the bundled resolver). */
const MIRAGON_LAYER_MODELING = `plugin:${MIRAGON_NAME}/recommended-for-modeling`;
const MIRAGON_LAYER_AUTOMATION = `plugin:${MIRAGON_NAME}/recommended-for-automation`;

const MIRAGON_LAYER: Record<Preset, string> = {
  modeling: MIRAGON_LAYER_MODELING,
  automation: MIRAGON_LAYER_AUTOMATION,
};

const ENGINE_LAYER: Record<Engine, EngineLayer> = {
  c7: new EngineLayer({ engine: 'c7', ...camunda7, miragonLayer: camunda7Layer }),
  c8: new EngineLayer({ engine: 'c8', ...camunda8, miragonLayer: camunda8Layer }),
};

const ENGINE_RULES: Record<Engine, unknown> = {
  c7: camunda7.camunda7Rules,
  c8: camunda8.camunda8Rules,
};

export interface DefaultLintConfigOptions {
  /**
   * The execution platform whose deployability layer + typed moddle to add. Omit for the
   * structural + Miragon base alone.
   */
  engine?: Engine;
  /**
   * The engine version (`8.9`, `8.9.1`) whose camunda-compat config to use: the nearest older one
   * when camunda-compat has none for it. Defaults to the latest. Ignored without an `engine`.
   */
  version?: string;
  /**
   * The Miragon opinion layer. Defaults to `automation` when an `engine` is given and `modeling`
   * otherwise — pass it explicitly to decouple the two, e.g. a modeler wanting the engine's typed
   * moddle and deployability rules but the relaxed modeling opinion layer.
   */
  preset?: Preset;
}

/** Builds the bpmnlint config and rule-set for an engine from the bundled layers. */
export class EngineConfig {
  /**
   * The zero-config default config for a host with no `.bpmnlintrc`: structural base + Miragon
   * opinion, plus the matching Camunda engine layers and moddle extension when `engine` is given.
   */
  static defaultLintConfig(this: void, options: DefaultLintConfigOptions = {}): BpmnlintConfig {
    const { engine, version } = options;
    const preset: Preset = options.preset ?? (engine ? 'automation' : 'modeling');

    const base = [structuralLayer, MIRAGON_LAYER[preset]];

    if (!engine) {
      return { extends: base };
    }

    const engineLayer = ENGINE_LAYER[engine].config(version);
    return { ...engineLayer, extends: [...base, ...engineLayer.extends] };
  }

  /**
   * The engine layers alone, without the structural base and the Miragon opinion layer: for a host
   * that checks the structure itself and wants only what the engine refuses or ignores.
   */
  static engineLintConfig(this: void, engine: Engine, version?: string): BpmnlintConfig {
    return ENGINE_LAYER[engine].config(version);
  }

  /**
   * The deployability rule-set for an engine (the camunda-compat shareable config), or the shared
   * structural rule-set when no engine is given.
   */
  static rulesForEngine(this: void, engine?: Engine): unknown {
    return engine ? ENGINE_RULES[engine] : commonRules;
  }
}
