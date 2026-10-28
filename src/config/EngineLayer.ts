import type { BpmnlintConfig, Engine, RuleSet } from '../lib/bpmnlint-config';
import { MIRAGON_NAME } from '../lib/plugin-names';

/** What one engine contributes to a lint config, as its two rule-set folders export it. */
export interface EngineLayerSource {
  engine: Engine;
  /** camunda-compat's config names for this engine, keyed by `<major>.<minor>`. */
  configNamesByVersion: Record<string, string>;
  /** The pinned newest config, the target of a diagram without a version. */
  configName: string;
  moddleExtension: { prefix: string; descriptor: unknown };
  /** The Miragon engine layer: rule name to severity. */
  miragonLayer: BpmnlintConfig;
}

const ENGINE_LAYER_NAME: Record<Engine, string> = { c7: 'camunda-7', c8: 'camunda-8' };

/**
 * One engine's part of a lint config: camunda-compat's config for the engine version, the Miragon
 * engine layer (the checks camunda-compat leaves out) and the moddle extension both read.
 */
export class EngineLayer {
  constructor(private readonly source: EngineLayerSource) {}

  /**
   * The camunda-compat config for `version` (`8.9`, `8.9.1`): the config of that minor version, of
   * the newest older one camunda-compat ships, or the oldest for a version older than all of them.
   * Without a version, or for one newer than the pinned config, it is the pinned config.
   */
  compatConfigName(version?: string): string {
    const { configNamesByVersion, configName } = this.source;
    const minor = version && /^\s*(\d+\.\d+)/.exec(version)?.[1];
    if (!minor) {
      return configName;
    }

    const versions = Object.keys(configNamesByVersion).sort((left, right) =>
      this.compareVersions(left, right),
    );
    const pinned = versions.find((candidate) => configNamesByVersion[candidate] === configName)!;
    const capped = this.compareVersions(minor, pinned) > 0 ? pinned : minor;
    const match =
      [...versions].reverse().find((candidate) => this.compareVersions(candidate, capped) <= 0) ??
      versions[0]!;
    return configNamesByVersion[match]!;
  }

  /**
   * The `extends` entries, moddle extension and per-rule version the engine adds to a config. When
   * `version` is given, every Miragon engine rule is told it, as camunda-compat's configs tell theirs.
   */
  config(
    version?: string,
  ): Required<Pick<BpmnlintConfig, 'extends' | 'moddleExtensions'>> &
    Pick<BpmnlintConfig, 'rules'> {
    const { moddleExtension, miragonLayer, engine } = this.source;
    const minor = version && /^\s*(\d+\.\d+)/.exec(version)?.[1];
    return {
      extends: [
        `plugin:camunda-compat/${this.compatConfigName(version)}`,
        `plugin:${MIRAGON_NAME}/${ENGINE_LAYER_NAME[engine]}`,
      ],
      moddleExtensions: { [moddleExtension.prefix]: moddleExtension.descriptor },
      ...(minor ? { rules: this.withVersion(miragonLayer.rules ?? {}, minor) } : {}),
    };
  }

  private withVersion(rules: RuleSet, version: string): RuleSet {
    return Object.fromEntries(
      Object.entries(rules).map(([name, severity]) => [
        name,
        [Array.isArray(severity) ? severity[0] : severity, { version }],
      ]),
    );
  }

  private compareVersions(left: string, right: string): number {
    const [leftMajor = 0, leftMinor = 0] = left.split('.').map(Number);
    const [rightMajor = 0, rightMinor = 0] = right.split('.').map(Number);
    return leftMajor - rightMajor || leftMinor - rightMinor;
  }
}
