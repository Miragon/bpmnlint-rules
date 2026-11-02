import { createRequire } from 'node:module';

import Linter from 'bpmnlint/lib/linter';
import { createModdle } from 'bpmnlint/lib/testers/helper';

import type * as plugin from '../../src/index';
import type * as engineEntry from '../../src/engine';
import type * as camunda7Entry from '../../src/camunda-7';
import type { Engine } from '../../src/lib/bpmnlint-config';
import type { ModdleElement } from '../../src/lib/moddle';

import { generateLargeC7Model, largeModelPresets } from './large-model';

/** Timed from the built bundle, as the rules benchmark is (see `rules.bench.ts`). */
const load = createRequire(import.meta.url);
const { createBundledResolver, getDefaultLintConfig }: typeof plugin = load('../../dist/index.cjs');
const { lint }: typeof engineEntry = load('../../dist/engine.cjs');
const ENTRIES: Record<Engine, typeof camunda7Entry> = {
  c7: load('../../dist/camunda-7.cjs'),
  c8: load('../../dist/camunda-8.cjs'),
};

const NODE_COUNTS = [500, 2000] as const;
const WARMUP_RUNS = 3;
const TIMED_RUNS = 10;

/** The large Camunda 7 model as a Camunda 8 diagram: the zeebe namespace, no camunda attributes. */
function asCamunda8(xml: string): string {
  return xml
    .replace(
      'xmlns:camunda="http://camunda.org/schema/1.0/bpmn"',
      'xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"',
    )
    .replace(/ camunda:[a-zA-Z]+="[^"]*"/g, '')
    .replace('"Camunda Platform"', '"Camunda Cloud"')
    .replace('"7.24.0"', '"8.10.0"');
}

async function medianMs(run: () => unknown): Promise<number> {
  const durations: number[] = [];
  for (let index = 0; index < WARMUP_RUNS + TIMED_RUNS; index++) {
    const startedAt = performance.now();
    await run();
    durations.push(performance.now() - startedAt);
  }
  const timed = durations.slice(WARMUP_RUNS).sort((left, right) => left - right);
  return timed[Math.floor(timed.length / 2)]!;
}

describe("camunda-compat's rules: bpmnlint's Linter against lint", () => {
  const rows: string[] = [];

  afterAll(() => {
    console.log(
      [`median of ${TIMED_RUNS} runs after ${WARMUP_RUNS} warm-up`, '', ...rows].join('\n'),
    );
  });

  it.each(['c7', 'c8'] as const)('lints the large %s model with both', async (engine) => {
    const { compatRules, moddleExtensions } = ENTRIES[engine];
    for (const nodeCount of NODE_COUNTS) {
      const { xml } = generateLargeC7Model(largeModelPresets[nodeCount]);
      const { root }: { root: ModdleElement } = await createModdle(
        engine === 'c8' ? asCamunda8(xml) : xml,
        undefined,
        moddleExtensions,
      );
      const { extends: layers, moddleExtensions: parsed } = getDefaultLintConfig({ engine });
      const config = { extends: (layers as string[]).at(-1), moddleExtensions: parsed };
      const linterMs = await medianMs(() =>
        new Linter({ resolver: createBundledResolver() }).lint(root, config),
      );
      const rules = compatRules();
      const lintMs = await medianMs(() => lint(root, rules));

      expect(lint(root, compatRules())).toEqual(
        await new Linter({ resolver: createBundledResolver() }).lint(root, config),
      );
      rows.push(
        `${engine} ${nodeCount} nodes: Linter ${linterMs.toFixed(1)} ms, lint ${lintMs.toFixed(1)} ms`,
      );
    }
  });
});
