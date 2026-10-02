import { createRequire } from 'node:module';

import Linter from 'bpmnlint/lib/linter';
import { createModdle } from 'bpmnlint/lib/testers/helper';

import type * as plugin from '../../src/index';
import type { ResolverEntries, RuleSet } from '../../src/lib/bpmnlint-config';
import type { ModdleElement } from '../../src/lib/moddle';

import { getDefaultLintConfig } from '../../src/config/engineConfig';
import * as common from '../../src/rules/common';
import * as camunda7 from '../../src/rules/camunda-7';
import * as camunda8 from '../../src/rules/camunda-8';
import { MIRAGON_NAME, miragonRuleFactories } from '../../src/rules/miragon';

import { generateLargeC7Model, largeModelPresets } from './large-model';
import { MAX_TIME_RATIO_5000_TO_2000_NODES, targetTimeMsAt5000Nodes } from './targets';

/**
 * The rules are timed as they ship: from the built bundle, loaded by Node itself. Vitest's module
 * runner routes every cross-module call in `src/` through an import accessor, which doubles the
 * time of a rule that calls `src/lib/` helpers per element.
 */
const { createBundledResolver }: typeof plugin = createRequire(import.meta.url)(
  '../../dist/index.cjs',
);

const NODE_COUNTS = [500, 2000, 5000] as const;
type NodeCount = (typeof NODE_COUNTS)[number];

interface RunCounts {
  warmupRuns: number;
  timedRuns: number;
}

const ENFORCED_RUNS: RunCounts = { warmupRuns: 3, timedRuns: 15 };
const REPORTED_RUNS: RunCounts = { warmupRuns: 1, timedRuns: 3 };

interface LargeModel {
  root: ModdleElement;
  parseWarnings: unknown[];
  expectedFlowElementCount: number;
}

interface RuleUnderTest {
  configKey: string;
  options?: unknown;
}

interface Measurement {
  medianMs: Record<NodeCount, number>;
  timeRatio5000To2000Nodes: number;
  ruleThrew: boolean;
}

interface UpstreamLayer {
  layer: string;
  resolverEntries: ResolverEntries;
  ruleSet: RuleSet;
}

const UPSTREAM_LAYERS: UpstreamLayer[] = [
  { layer: 'common', resolverEntries: common.resolverEntries, ruleSet: {} },
  {
    layer: 'camunda-7',
    resolverEntries: camunda7.resolverEntries,
    ruleSet: (camunda7.camunda7Rules?.rules ?? {}) as RuleSet,
  },
  {
    layer: 'camunda-8',
    resolverEntries: camunda8.resolverEntries,
    ruleSet: (camunda8.camunda8Rules?.rules ?? {}) as RuleSet,
  },
];

const RULE_KEY_PREFIX = 'rule:';

function upstreamRules({ resolverEntries, ruleSet }: UpstreamLayer): RuleUnderTest[] {
  return Object.keys(resolverEntries)
    .filter((key) => key.startsWith(RULE_KEY_PREFIX))
    .map((key) => {
      const configKey = key.slice(RULE_KEY_PREFIX.length);
      const setting = ruleSet[configKey.slice(configKey.lastIndexOf('/') + 1)];

      return Array.isArray(setting) ? { configKey, options: setting[1] } : { configKey };
    });
}

async function parseLargeModel(nodeCount: NodeCount): Promise<LargeModel> {
  const { xml, flowNodeCount, sequenceFlowCount } = generateLargeC7Model(
    largeModelPresets[nodeCount],
  );
  const { root, warnings } = await createModdle(
    xml,
    getDefaultLintConfig({ engine: 'c7' }).moddleExtensions,
  );

  return {
    root,
    parseWarnings: warnings,
    expectedFlowElementCount: flowNodeCount + sequenceFlowCount,
  };
}

function median(durations: number[]): number {
  const ascending = [...durations].sort((left, right) => left - right);

  return ascending[Math.floor(ascending.length / 2)] ?? Number.NaN;
}

/**
 * Lints through a fresh `Linter`: bpmnlint caches rule instances per linter, and rules keep per-run
 * state in their closure. A rule that throws is reported by bpmnlint as a `rule-error` finding
 * instead of failing the lint run, which would make a crashing rule look fast.
 */
async function timeSingleLintRun({ configKey, options }: RuleUnderTest, root: ModdleElement) {
  const linter = new Linter({ resolver: createBundledResolver() });
  const config = { rules: { [configKey]: options === undefined ? 'error' : ['error', options] } };

  const startedAt = performance.now();
  const reports = await linter.lint(root, config);
  const durationMs = performance.now() - startedAt;

  const ruleThrew = Object.values(reports)
    .flat()
    .some((report) => report.category === 'rule-error');

  return { durationMs, ruleThrew };
}

function formatMs(durationMs: number): string {
  return `${durationMs.toFixed(1)} ms`;
}

function renderTable(rows: string[][]): string {
  const columnWidths = rows.reduce<number[]>(
    (widths, row) => row.map((cell, column) => Math.max(widths[column] ?? 0, cell.length)),
    [],
  );

  return rows
    .map((row) =>
      row
        .map((cell, column) => cell.padEnd(columnWidths[column] ?? 0))
        .join('  ')
        .trimEnd(),
    )
    .join('\n');
}

describe('rule benchmark', () => {
  const largeModels = new Map<NodeCount, LargeModel>();
  const tableRows: string[][] = [
    ['layer', 'rule', '500', '2,000', '5,000', '5k / 2k', 'target', 'status'],
  ];

  function largeModel(nodeCount: NodeCount): LargeModel {
    const model = largeModels.get(nodeCount);
    if (!model) {
      throw new Error(`the ${nodeCount}-node model was not parsed`);
    }
    return model;
  }

  async function measure(rule: RuleUnderTest, runs: RunCounts): Promise<Measurement> {
    const durations: Record<NodeCount, number[]> = { 500: [], 2000: [], 5000: [] };
    let ruleThrew = false;

    for (let run = 0; run < runs.warmupRuns + runs.timedRuns; run++) {
      for (const nodeCount of NODE_COUNTS) {
        const lintRun = await timeSingleLintRun(rule, largeModel(nodeCount).root);
        ruleThrew ||= lintRun.ruleThrew;
        if (run >= runs.warmupRuns) {
          durations[nodeCount].push(lintRun.durationMs);
        }
      }
    }

    const medianMs = {
      500: median(durations[500]),
      2000: median(durations[2000]),
      5000: median(durations[5000]),
    };

    return { medianMs, timeRatio5000To2000Nodes: medianMs[5000] / medianMs[2000], ruleThrew };
  }

  function addTableRow(
    layer: string,
    ruleName: string,
    { medianMs, timeRatio5000To2000Nodes }: Measurement,
    target: string,
    status: string,
  ) {
    tableRows.push([
      layer,
      ruleName,
      formatMs(medianMs[500]),
      formatMs(medianMs[2000]),
      formatMs(medianMs[5000]),
      timeRatio5000To2000Nodes.toFixed(1),
      target,
      status,
    ]);
  }

  beforeAll(async () => {
    for (const nodeCount of NODE_COUNTS) {
      largeModels.set(nodeCount, await parseLargeModel(nodeCount));
    }
  });

  afterAll(() => {
    const runsOf = ({ warmupRuns, timedRuns }: RunCounts) =>
      `median of ${timedRuns} runs after ${warmupRuns} warm-up`;

    console.log(
      [
        `Node ${process.version} · miragon: ${runsOf(ENFORCED_RUNS)} · upstream: ${runsOf(REPORTED_RUNS)}`,
        '',
        renderTable(tableRows),
      ].join('\n'),
    );
  });

  it('lints fully parsed models of the expected size', () => {
    for (const nodeCount of NODE_COUNTS) {
      const { root, parseWarnings, expectedFlowElementCount } = largeModel(nodeCount);

      expect(parseWarnings).toEqual([]);
      expect(root.rootElements[0].flowElements).toHaveLength(expectedFlowElementCount);
    }
  });

  it('has a target time for every Miragon rule', () => {
    expect(
      Object.keys(targetTimeMsAt5000Nodes).sort(),
      'test/bench/targets.ts must name every rule in miragonRuleFactories, and only those',
    ).toEqual(Object.keys(miragonRuleFactories).sort());
  });

  for (const [ruleName, targetMs] of Object.entries(targetTimeMsAt5000Nodes)) {
    it(`${ruleName} stays within its target time and scales linearly`, async () => {
      const measurement = await measure(
        { configKey: `${MIRAGON_NAME}/${ruleName}` },
        ENFORCED_RUNS,
      );
      const { medianMs, timeRatio5000To2000Nodes, ruleThrew } = measurement;

      const failures = [
        ...(ruleThrew ? ['rule threw'] : []),
        ...(medianMs[5000] < targetMs ? [] : ['over target']),
        ...(timeRatio5000To2000Nodes < MAX_TIME_RATIO_5000_TO_2000_NODES ? [] : ['not linear']),
      ];
      addTableRow('miragon', ruleName, measurement, `${targetMs} ms`, failures.join(', ') || 'ok');

      expect(
        failures,
        `${formatMs(medianMs[5000])} at 5,000 nodes (target ${targetMs} ms), ` +
          `5k / 2k time ratio ${timeRatio5000To2000Nodes.toFixed(1)} ` +
          `(must stay below ${MAX_TIME_RATIO_5000_TO_2000_NODES}: linear is about 2.5, quadratic about 6.25)`,
      ).toEqual([]);
    });
  }

  it('reports the bundled upstream rules without enforcing them', async () => {
    for (const upstreamLayer of UPSTREAM_LAYERS) {
      for (const rule of upstreamRules(upstreamLayer)) {
        const measurement = await measure(rule, REPORTED_RUNS);

        addTableRow(
          upstreamLayer.layer,
          rule.configKey,
          measurement,
          '-',
          measurement.ruleThrew ? 'rule threw' : 'reported only',
        );
      }
    }
  });
});
