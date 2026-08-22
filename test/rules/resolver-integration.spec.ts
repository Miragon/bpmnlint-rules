import Linter from 'bpmnlint/lib/linter';

import { createBundledResolver, getDefaultLintConfig } from '../../src';
import type { DefaultLintConfigOptions, Engine } from '../../src';
import { model } from '../support/model';

/**
 * The end-to-end proof: the bundled resolver plus a per-engine config actually drive bpmnlint's
 * `Linter` over a real moddle tree, and each engine layer contributes what it should.
 *
 * The fixture is one disconnected service task in an executable process — enough to trip the
 * structural base (missing start/end event) under every engine, and enough for each Camunda layer
 * to add its own deployability finding: C7 wants a history-time-to-live, C8 wants a task
 * implementation.
 */
async function lintKeys(engine?: Engine): Promise<string[]> {
  const parsed = (await model({ shapes: [{ id: 'serviceTask_A', tag: 'serviceTask' }] })) as {
    root: unknown;
  };

  const linter = new Linter({
    config: getDefaultLintConfig(engine ? { engine } : {}),
    resolver: createBundledResolver(),
  });

  return Object.keys(await linter.lint(parsed.root));
}

function extendsOf(options: DefaultLintConfigOptions): string[] {
  return getDefaultLintConfig(options).extends as string[];
}

describe('bundled resolver + engine config, end to end', () => {
  it('fires the structural base under every engine', async () => {
    for (const engine of [undefined, 'c7', 'c8'] as const) {
      const keys = await lintKeys(engine);
      expect(keys, `engine ${engine ?? 'none'}`).toContain('start-event-required');
      expect(keys, `engine ${engine ?? 'none'}`).toContain('end-event-required');
    }
  });

  it('adds no Camunda deployability findings when no engine is given', async () => {
    const keys = await lintKeys();
    expect(keys.some((key) => key.startsWith('camunda-compat/'))).toBe(false);
  });

  it('adds a Camunda 7 deployability finding for engine c7', async () => {
    expect(await lintKeys('c7')).toContain('camunda-compat/history-time-to-live');
  });

  it('adds a Camunda 8 deployability finding for engine c8', async () => {
    expect(await lintKeys('c8')).toContain('camunda-compat/implementation');
  });
});

describe('getDefaultLintConfig preset selection', () => {
  const MODELING = 'plugin:@miragon/rules/recommended-for-modeling';
  const AUTOMATION = 'plugin:@miragon/rules/recommended-for-automation';

  it('defaults the preset from the engine — modeling engine-less, automation engine-bound', () => {
    expect(extendsOf({})).toContain(MODELING);
    expect(extendsOf({ engine: 'c8' })).toContain(AUTOMATION);
  });

  it('honours an explicit preset regardless of the engine', () => {
    expect(extendsOf({ preset: 'automation' })).toContain(AUTOMATION);
    expect(extendsOf({ engine: 'c8', preset: 'modeling' })).toContain(MODELING);
  });

  it('keeps the engine deployability layer when the modeling preset is forced', () => {
    const extendsLayers = extendsOf({ engine: 'c7', preset: 'modeling' });
    expect(extendsLayers).toContain(MODELING);
    expect(extendsLayers.some((layer) => layer.startsWith('plugin:camunda-compat/'))).toBe(true);
    expect(
      getDefaultLintConfig({ engine: 'c7', preset: 'modeling' }).moddleExtensions,
    ).toHaveProperty('camunda');
  });
});
