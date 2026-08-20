import camundaCompat from 'bpmnlint-plugin-camunda-compat';

import { bundledResolverEntries } from '../../src/resolver/createBundledResolver';
import { configName as camunda7Config } from '../../src/rules/camunda-7';
import { configName as camunda8Config } from '../../src/rules/camunda-8';

/**
 * Guards the hand-maintained `camunda-7` / `camunda-8` folders against upstream drift, on two axes:
 *
 *  1. **Rule list** — each folder enumerates the rule modules its pinned camunda-compat config
 *     references (a list a bundler can't derive, since bpmnlint names rules by require-path string).
 *     This walks both pinned configs' referenced rules and asserts every one resolves, so a
 *     camunda-compat bump that adds or renames a referenced rule fails the build until the folder is
 *     updated — rather than silently dropping a rule at lint time.
 *
 *  2. **Config version** — the folders deliberately pin an explicit engine config (e.g.
 *     `camunda-cloud-8-10`) rather than auto-selecting the latest, so a dependency bump never
 *     silently moves the engine target. The tripwire below fails when camunda-compat ships a *newer*
 *     config in the same family, turning "time to bump the engine target" into a red CI instead of
 *     silent staleness.
 */
const PINNED_CONFIGS = [camunda7Config, camunda8Config];

/** The resolver cache key for a rule name as it appears in a camunda-compat config. */
function ruleKey(ruleName: string): string {
  // A qualified name like `bpmnlint/start-event-required` references another plugin's rule; a bare
  // name is camunda-compat's own.
  return ruleName.includes('/')
    ? `rule:${ruleName}`
    : `rule:bpmnlint-plugin-camunda-compat/${ruleName}`;
}

/** Splits `camunda-cloud-8-10` into its family (`camunda-cloud`) and numeric `[major, minor]`. */
function parseConfig(name: string): { family: string; version: [number, number] } | null {
  const match = /^(camunda-(?:cloud|platform))-(\d+)-(\d+)$/.exec(name);
  if (!match) {
    return null;
  }
  return { family: match[1]!, version: [Number(match[2]), Number(match[3])] };
}

/** Is version `a` newer than `b`? Compares major, then minor. */
function isNewer(first: [number, number], second: [number, number]): boolean {
  return first[0] !== second[0] ? first[0] > second[0] : first[1] > second[1];
}

describe('bundled resolver stays in sync with camunda-compat', () => {
  for (const configName of PINNED_CONFIGS) {
    it(`resolves every rule referenced by ${configName}`, () => {
      const config = camundaCompat.configs[configName];
      expect(config, `camunda-compat no longer ships ${configName}`).toBeDefined();

      const ruleNames = Object.keys(config?.rules ?? {});
      expect(ruleNames.length).toBeGreaterThan(0);

      for (const ruleName of ruleNames) {
        const key = ruleKey(ruleName);
        expect(
          bundledResolverEntries,
          `rule <${ruleName}> from ${configName} is not bundled (missing ${key})`,
        ).toHaveProperty([key]);
      }
    });

    it(`bundles the ${configName} config itself`, () => {
      expect(bundledResolverEntries).toHaveProperty([
        `config:bpmnlint-plugin-camunda-compat/${configName}`,
      ]);
    });

    it(`pins the latest ${configName} camunda-compat ships (bump the engine folder if this fails)`, () => {
      const pinned = parseConfig(configName);
      expect(pinned, `unexpected config name shape: ${configName}`).not.toBeNull();

      const newer = Object.keys(camundaCompat.configs)
        .map(parseConfig)
        .filter((entry): entry is { family: string; version: [number, number] } => entry !== null)
        .filter((entry) => entry.family === pinned!.family)
        .filter((entry) => isNewer(entry.version, pinned!.version))
        .map((entry) => `${entry.family}-${entry.version[0]}-${entry.version[1]}`);

      const folder = pinned!.family === 'camunda-cloud' ? 'camunda-8' : 'camunda-7';
      expect(
        newer,
        `camunda-compat now ships newer config(s) than the pinned ${configName}: ${newer.join(', ')}. ` +
          `Bump CONFIG in src/rules/${folder}/index.ts and add any newly referenced rule imports.`,
      ).toEqual([]);
    });
  }
});
