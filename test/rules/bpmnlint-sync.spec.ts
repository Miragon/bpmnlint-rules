import bpmnlintRecommended from 'bpmnlint/config/recommended';
import bpmnlintAll from 'bpmnlint/config/all';
import bpmnlintCorrectness from 'bpmnlint/config/correctness';

import { bundledResolverEntries } from '../../src/resolver/createBundledResolver';

/**
 * The `common` folder statically bundles bpmnlint's own built-in rules and configs so
 * `createBundledResolver()` is self-contained (a bundler can't follow bpmnlint's dynamic
 * require-paths, and the resolver throws — not skips — on a miss). Unlike the camunda folders there
 * is no engine version to pin: bpmnlint ships stable config names. What must stay in sync is the
 * *rule list*, so this walks every config `common` bundles and asserts each referenced rule
 * resolves. `bpmnlint:all` enumerates every built-in rule, so a bpmnlint bump that adds one fails
 * here until `src/rules/common/index.ts` imports it.
 */
const BPMNLINT_CONFIGS = {
  recommended: bpmnlintRecommended,
  all: bpmnlintAll,
  correctness: bpmnlintCorrectness,
};

describe('bundled resolver stays in sync with bpmnlint built-ins', () => {
  for (const [configName, config] of Object.entries(BPMNLINT_CONFIGS)) {
    it(`bundles the bpmnlint:${configName} config and every rule it references`, () => {
      expect(bundledResolverEntries).toHaveProperty([`config:bpmnlint/${configName}`]);

      const ruleNames = Object.keys(config.rules ?? {});
      expect(ruleNames.length).toBeGreaterThan(0);

      for (const ruleName of ruleNames) {
        expect(
          bundledResolverEntries,
          `bpmnlint rule <${ruleName}> (from bpmnlint:${configName}) is not bundled — ` +
            `import it in src/rules/common/index.ts`,
        ).toHaveProperty([`rule:bpmnlint/${ruleName}`]);
      }
    });
  }
});
