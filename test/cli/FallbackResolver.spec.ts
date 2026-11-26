import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { FallbackResolver } from '../../src/cli/FallbackResolver';
import type { Resolver } from '../../src/resolver/Resolver';

class MapResolver implements Resolver {
  constructor(private readonly entries: Record<string, string>) {}

  resolveRule(pkg: string, ruleName: string): unknown {
    return this.lookup(`rule:${pkg}/${ruleName}`);
  }

  resolveConfig(pkg: string, configName: string): unknown {
    return this.lookup(`config:${pkg}/${configName}`);
  }

  private lookup(key: string): unknown {
    if (!(key in this.entries)) {
      throw new Error(`cannot resolve <${key}>`);
    }
    return this.entries[key];
  }
}

const installed = new MapResolver({ 'config:plugin/strict': 'installed strict' });
const bundled = new MapResolver({
  'config:plugin/strict': 'bundled strict',
  'rule:plugin/newer-rule': 'bundled newer rule',
});

describe('FallbackResolver', () => {
  it('uses an installed package for all of its rules and configs, never mixing in the bundled one', () => {
    const resolver = new FallbackResolver(installed, bundled, () => true);

    expect(resolver.resolveConfig('plugin', 'strict')).toBe('installed strict');
    expect(() => resolver.resolveRule('plugin', 'newer-rule')).toThrow(
      'cannot resolve <rule:plugin/newer-rule>',
    );
  });

  it('uses the bundled package when it is not installed', () => {
    const resolver = new FallbackResolver(installed, bundled, () => false);

    expect(resolver.resolveConfig('plugin', 'strict')).toBe('bundled strict');
    expect(resolver.resolveRule('plugin', 'newer-rule')).toBe('bundled newer rule');
  });

  it('counts a package as installed when node_modules holds it', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'fallback-resolver-'));
    try {
      mkdirSync(path.join(dir, 'node_modules', 'bpmnlint-plugin-local'), { recursive: true });
      writeFileSync(
        path.join(dir, 'node_modules', 'bpmnlint-plugin-local', 'package.json'),
        JSON.stringify({ name: 'bpmnlint-plugin-local', main: 'missing.js' }),
      );

      const resolver = FallbackResolver.forDirectory(dir);

      // Installed (even with a broken entry point): its own error, not a bundled fallback.
      expect(() => resolver.resolveConfig('bpmnlint-plugin-local', 'recommended')).toThrow(
        /cannot resolve config <recommended> from <bpmnlint-plugin-local>/,
      );
      // Not installed: the bundled copy.
      expect(resolver.resolveConfig('@miragon/bpmnlint-plugin-rules', 'strict')).toBeTruthy();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
