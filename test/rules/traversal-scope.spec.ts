import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import traverse from 'bpmnlint/lib/traverse';
import { createModdle } from 'bpmnlint/lib/testers/helper';

import { EngineConfig } from '../../src/config/EngineConfig';
import type { Engine } from '../../src/core/bpmnlint-config';
import type { ModdleElement } from '../../src/core/moddle';
import { miragonRuleFactories } from '../../src/rules/miragon';
import { model } from '../support/model';

/**
 * The rules that read the semantic model element by element. Every other Miragon rule does its
 * work on `bpmn:Definitions` alone.
 */
const SEMANTIC_RULES = [
  'no-generated-ids',
  'element-id-naming',
  'worker-topic-naming',
  'message-name-naming',
  'async-continuations',
];

const DIAGRAM_INTERCHANGE_PREFIX = { 'bpmndi:BPMNShape': 'shape_' };

const FIXTURES_DIR = fileURLToPath(new URL('../fixtures/rules', import.meta.url));

const FIXTURE_FILES = readdirSync(FIXTURES_DIR).flatMap((folder) =>
  ['valid', 'invalid'].map((kind) => `${folder}/${kind}.bpmn`),
);

const PARSE_ENGINES: (Engine | undefined)[] = [undefined, 'c7', 'c8'];

interface Finding {
  id: string;
  message: string;
}

interface Walk {
  visitedTypes: string[];
  findings: Finding[];
}

const isInsideDiagramInterchange = (type: string): boolean =>
  type !== 'bpmndi:BPMNDiagram' &&
  ['bpmndi:', 'dc:', 'di:'].some((namespace) => type.startsWith(namespace));

/**
 * Runs a Miragon rule over the tree the way bpmnlint does: a `check` that returns `false` keeps
 * bpmnlint out of that element's children. With `honourSkip: false` every element is visited, as
 * it was before the rules started to skip.
 */
function walk(
  ruleName: string,
  root: ModdleElement,
  { config, honourSkip }: { config?: unknown; honourSkip: boolean },
): Walk {
  const factory = miragonRuleFactories[ruleName];
  if (!factory) {
    throw new Error(`no Miragon rule named ${ruleName}`);
  }

  const rule = factory(config);
  const findings: Finding[] = [];
  const visitedTypes: string[] = [];
  const reporter = { report: (id: string, message: string) => findings.push({ id, message }) };

  traverse(root, {
    enter: (element) => {
      visitedTypes.push(element.$type);
      const enterChildren = rule.check(element, reporter);
      return honourSkip ? enterChildren : undefined;
    },
  });

  return { visitedTypes, findings };
}

async function smallModel(): Promise<ModdleElement> {
  const { root } = (await model({
    shapes: [
      { id: 'startEvent_requested', tag: 'startEvent' },
      { id: 'serviceTask_claim', tag: 'serviceTask' },
    ],
    edges: [{ id: 'flow_claim', source: 'startEvent_requested', target: 'serviceTask_claim' }],
  })) as { root: ModdleElement };

  return root;
}

async function parseFixture(file: string, engine: Engine | undefined): Promise<ModdleElement> {
  const xml = readFileSync(`${FIXTURES_DIR}/${file}`, 'utf8');
  const moddleExtensions = engine
    ? EngineConfig.defaultLintConfig({ engine }).moddleExtensions
    : undefined;
  const { root } = await createModdle(xml, moddleExtensions);

  return root;
}

describe('the part of the tree each Miragon rule visits', () => {
  const definitionsRules = Object.keys(miragonRuleFactories).filter(
    (ruleName) => !SEMANTIC_RULES.includes(ruleName),
  );

  it.each(definitionsRules)('%s stops bpmnlint after bpmn:Definitions', async (ruleName) => {
    const { visitedTypes } = walk(ruleName, await smallModel(), { honourSkip: true });

    expect(visitedTypes).toEqual(['bpmn:Definitions']);
  });

  it.each(SEMANTIC_RULES)('%s skips the diagram interchange layer', async (ruleName) => {
    const { visitedTypes } = walk(ruleName, await smallModel(), { honourSkip: true });

    expect(visitedTypes).toContain('bpmn:ServiceTask');
    expect(visitedTypes).toContain('bpmndi:BPMNDiagram');
    expect(visitedTypes.filter(isInsideDiagramInterchange)).toEqual([]);
  });

  it('element-id-naming visits the diagram interchange layer once a DI type has a prefix', async () => {
    const { visitedTypes } = walk('element-id-naming', await smallModel(), {
      config: { prefixes: DIAGRAM_INTERCHANGE_PREFIX },
      honourSkip: true,
    });

    expect(visitedTypes).toContain('bpmndi:BPMNShape');
  });
});

describe('skipping part of the tree never changes what a rule reports', () => {
  const runs = Object.keys(miragonRuleFactories).flatMap((ruleName) => [
    { ruleName, config: undefined as unknown },
    ...(ruleName === 'element-id-naming'
      ? [{ ruleName, config: { prefixes: DIAGRAM_INTERCHANGE_PREFIX } as unknown }]
      : []),
  ]);

  it.each(runs)('$ruleName (config $config) on every fixture', async ({ ruleName, config }) => {
    for (const file of FIXTURE_FILES) {
      for (const engine of PARSE_ENGINES) {
        const root = await parseFixture(file, engine);
        const skipping = walk(ruleName, root, { config, honourSkip: true });
        const visitingAll = walk(ruleName, root, { config, honourSkip: false });

        expect(skipping.findings, `${file} parsed for ${engine ?? 'no engine'}`).toEqual(
          visitingAll.findings,
        );
      }
    }
  });
});
