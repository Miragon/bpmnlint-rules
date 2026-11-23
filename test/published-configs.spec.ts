import { describe, expect, it } from 'vitest';

import {
  bundledResolverEntries,
  configs,
  miragonRecommendedForAutomation,
  miragonRecommendedForModeling,
  miragonRuleFactories,
  miragonStrict,
  naming,
  recommendedForAutomation,
  recommendedForModeling,
  rules,
  strict,
} from '../src';

const publishedConfigs = {
  miragonRecommendedForModeling,
  miragonRecommendedForAutomation,
  miragonStrict,
  recommendedForModeling,
  recommendedForAutomation,
  strict,
};

describe('published configs', () => {
  it.each(Object.entries(publishedConfigs))(
    'freezes %s with its rules and extends',
    (_name, config) => {
      expect(Object.isFrozen(config)).toBe(true);
      if (config.rules) {
        expect(Object.isFrozen(config.rules)).toBe(true);
      }
      if (Array.isArray(config.extends)) {
        expect(Object.isFrozen(config.extends)).toBe(true);
      }
    },
  );

  it('refuses a consumer turning a rule off for every other linter', () => {
    const strictRules = miragonStrict.rules as Record<string, unknown>;

    expect(() => {
      strictRules['element-id-naming'] = 'off';
    }).toThrow(TypeError);
  });

  it('freezes the maps that hand the configs and rules out', () => {
    expect(Object.isFrozen(configs)).toBe(true);
    expect(Object.isFrozen(rules)).toBe(true);
    expect(Object.isFrozen(miragonRuleFactories)).toBe(true);
    expect(Object.isFrozen(bundledResolverEntries)).toBe(true);
  });

  it('freezes the shared naming defaults', () => {
    expect(Object.isFrozen(naming.DEFAULT_PREFIXES)).toBe(true);
    expect(Object.isFrozen(naming.resolveCase('camelCase'))).toBe(true);
  });
});
