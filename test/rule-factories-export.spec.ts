import { describe, expect, it } from 'vitest';

import * as root from '../src';
import { miragonRuleFactories } from '../src';

describe('rule factories on the package root', () => {
  it.each(Object.entries(miragonRuleFactories))('exports the factory of %s', (_name, factory) => {
    expect(Object.values(root)).toContain(factory);
  });
});
