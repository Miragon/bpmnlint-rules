import type {
  BpmnlintConfig,
  ResolverEntries,
  RuleSet,
  RuleSeverity,
} from '../lib/bpmnlint-config';
import type { RuleFactory } from '../lib/moddle';
import type { RuleEntry } from '../resolver/SinglePassLinter';

const COMPAT = 'camunda-compat';

const CATEGORY_BY_SEVERITY: Record<string, RuleEntry['category'] | 'off'> = {
  0: 'off',
  1: 'warn',
  2: 'error',
  3: 'info',
};

/** What camunda-compat contributes to one engine's lint, as its rule-set folder exports it. */
export interface EngineLayerSource {
  /** camunda-compat's config names for this engine, keyed by `<major>.<minor>`. */
  configNamesByVersion: Record<string, string>;
  /** The pinned newest config, the target of a diagram without a version. */
  configName: string;
  moddleExtension: { prefix: string; descriptor: unknown };
}

/** One engine's camunda-compat config for an engine version, and the moddle extension its rules read. */
export class EngineLayer {
  constructor(private readonly source: EngineLayerSource) {}

  /**
   * The camunda-compat config for `version` (`8.9`, `8.9.1`): the config of that minor version, of
   * the newest older one camunda-compat ships, or the oldest for a version older than all of them.
   * Without a version, or for one newer than the pinned config, it is the pinned config.
   */
  compatConfigName(version?: string): string {
    const { configNamesByVersion, configName } = this.source;
    const minor = EngineLayer.minorOf(version);
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

  /** camunda-compat's config for `version` (the latest when omitted) and the moddle extension. */
  config(version?: string): Required<Pick<BpmnlintConfig, 'extends' | 'moddleExtensions'>> {
    const { moddleExtension } = this.source;
    return {
      extends: [`plugin:camunda-compat/${this.compatConfigName(version)}`],
      moddleExtensions: { [moddleExtension.prefix]: moddleExtension.descriptor },
    };
  }

  /**
   * The rules of camunda-compat's config for `version` (the latest when omitted), each built with
   * its config, in the config's order and named as bpmnlint names them. `factories` holds the rule
   * modules by bpmnlint resolver key. Rules keep state per run, so a lint uses fresh rules or
   * reuses them as a bpmnlint `Linter` does.
   */
  rules(factories: ResolverEntries, version?: string): RuleEntry[] {
    const config = factories[
      `config:bpmnlint-plugin-${COMPAT}/${this.compatConfigName(version)}`
    ] as { rules: RuleSet };
    return Object.entries(config.rules).flatMap(([ruleName, setting]) => {
      const [severity, options] = Array.isArray(setting) ? setting : [setting];
      const category = this.categoryOf(severity);
      if (category === 'off') {
        return [];
      }
      const [pkg, name] = ruleName.includes('/') ? ruleName.split('/') : [COMPAT, ruleName];
      const factory = factories[`rule:${this.packageOf(pkg!)}/${name}`] as RuleFactory;
      return [{ name: `${pkg}/${name}`, category, rule: factory(options) }];
    });
  }

  /** `8.9` of `8.9.1`; undefined for no or an unreadable version. */
  static minorOf(version?: string): string | undefined {
    return (version && /^\s*(\d+\.\d+)/.exec(version)?.[1]) || undefined;
  }

  private compareVersions(left: string, right: string): number {
    const [leftMajor = 0, leftMinor = 0] = left.split('.').map(Number);
    const [rightMajor = 0, rightMinor = 0] = right.split('.').map(Number);
    return leftMajor - rightMajor || leftMinor - rightMinor;
  }

  private categoryOf(severity: RuleSeverity): RuleEntry['category'] | 'off' {
    const normalized = typeof severity === 'string' ? severity.toLowerCase() : severity;
    return CATEGORY_BY_SEVERITY[normalized] ?? (normalized as RuleEntry['category']);
  }

  private packageOf(pkg: string): string {
    return pkg === 'bpmnlint' ? pkg : `bpmnlint-plugin-${pkg}`;
  }
}
