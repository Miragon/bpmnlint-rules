import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import Linter from 'bpmnlint/lib/linter';
import { createModdle } from 'bpmnlint/lib/testers/helper';
import StaticResolver from 'bpmnlint/lib/resolver/static-resolver.js';
import zeebeModdle from 'zeebe-bpmn-moddle/resources/zeebe.json';

import startEventRequired from 'bpmnlint/rules/start-event-required.js';

import * as camunda7 from '../../src/camunda-7';
import * as camunda8 from '../../src/camunda-8';
import { EngineLayer } from '../../src/config/EngineLayer';
import * as camunda7Versions from '../../src/rules/camunda-7/versions';
import * as camunda8Versions from '../../src/rules/camunda-8/versions';
import { defineRule, EngineRule, lint } from '../../src/engine';
import type { Engine, ModdleElement, Reporter, RuleEntry } from '../../src/engine';

const FIXTURES = join(__dirname, '..', 'fixtures');

function bpmnFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return bpmnFiles(path);
    }
    return entry.name.endsWith('.bpmn') ? [path] : [];
  });
}

const TWO_TASKS = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="definitions_test" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="process_test" isExecutable="true">
    <bpmn:subProcess id="subProcess_test">
      <bpmn:task id="inner_test" />
    </bpmn:subProcess>
    <bpmn:task id="outer_test" />
  </bpmn:process>
</bpmn:definitions>`;

const visitedIds = () => {
  const check = (node: ModdleElement, reporter: Reporter) => {
    if (node.$type === 'bpmn:Task') {
      reporter.report(node.id, 'visited');
    }
    return node.$type !== 'bpmn:SubProcess';
  };
  return { check };
};

const enterAndLeave = () => ({
  check: {
    enter: (node: ModdleElement, reporter: Reporter) => {
      if (node.$type === 'bpmn:Task') {
        reporter.report(node.id, 'enter', ['name']);
      }
    },
    leave: (node: ModdleElement, reporter: Reporter) => {
      if (node.$type === 'bpmn:SubProcess') {
        // eslint-disable-next-line id-denylist -- camunda-compat's name for it
        reporter.report(node.id, 'leave', { path: ['flowElements'], data: { type: 'test' } });
      }
    },
  },
});

const throwsOnTask = () => ({
  check: (node: ModdleElement, reporter: Reporter) => {
    if (node.id === 'outer_test') {
      throw new Error('broken rule');
    }
    reporter.report(node.id, 'before the throw');
  },
});

const SYNTHETIC: Record<string, () => RuleEntry['rule']> = {
  'test/visited-ids': visitedIds,
  'test/enter-and-leave': enterAndLeave,
  'test/throws-on-task': throwsOnTask,
};

const RESOLVER = new StaticResolver(
  Object.fromEntries(
    Object.entries(SYNTHETIC).map(([name, factory]) => [`rule:bpmnlint-plugin-${name}`, factory]),
  ),
);

const entriesOf = (rules: Record<string, RuleEntry['category']>): RuleEntry[] =>
  Object.entries(rules).map(([name, category]) => ({ name, category, rule: SYNTHETIC[name]!() }));

class TaskWithoutName extends EngineRule {
  protected readonly engine: Engine = 'c8';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (node.$type === 'bpmn:ServiceTask' && !node.name && this.runsAtLeast(node, '8.6')) {
      // eslint-disable-next-line id-denylist -- camunda-compat's name for it
      reporter.report(node.id, 'has no name', { path: ['name'], data: { type: 'test' } });
    }
  }
}

const taskWithoutName = defineRule(
  { ruleName: 'task-without-name', kind: 'engine-specific', targetEngine: 'c8' },
  TaskWithoutName,
);

const C8_SERVICE_TASK_WITHOUT_TYPE = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"
    xmlns:modeler="http://camunda.org/schema/modeler/1.0"
    modeler:executionPlatform="Camunda Cloud" modeler:executionPlatformVersion="8.6.0"
    id="definitions_test" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="process_test" isExecutable="true">
    <bpmn:startEvent id="startEvent_test" />
    <bpmn:serviceTask id="serviceTask_test" />
  </bpmn:process>
</bpmn:definitions>`;

describe('lint', () => {
  it.each([
    ['8.9', 'camunda-cloud-8-9'],
    ['8.9.3', 'camunda-cloud-8-9'],
    ['8.42', 'camunda-cloud-8-10'],
    [undefined, 'camunda-cloud-8-10'],
    ['7.21.0', 'camunda-platform-7-21'],
    ['7.10', 'camunda-platform-7-19'],
  ])('builds the camunda-compat rules for %s from %s', (version, configName) => {
    const compat = configName.includes('platform') ? camunda7Versions : camunda8Versions;
    expect(new EngineLayer(compat).compatConfigName(version)).toBe(configName);
  });

  it('reads the engine version anew on every run of the same rules', async () => {
    const { root }: { root: ModdleElement } = await createModdle(C8_SERVICE_TASK_WITHOUT_TYPE, {
      zeebe: zeebeModdle,
    });
    const rules: RuleEntry[] = [
      { name: 'host/task-without-name', category: 'warn', rule: taskWithoutName() },
    ];
    expect(lint(root, rules)['host/task-without-name']).toHaveLength(1);

    root.set('modeler:executionPlatformVersion', '8.5.0');
    expect(lint(root, rules)).toEqual({});

    root.set('modeler:executionPlatform', 'Camunda Platform');
    root.set('modeler:executionPlatformVersion', '8.6.0');
    expect(lint(root, rules)).toEqual({});
  });

  it.each([
    ['c7', camunda7, camunda7Versions, ['7.19', '7.24', undefined]],
    ['c8', camunda8, camunda8Versions, ['8.2', '8.9', '8.10', undefined]],
  ] as const)(
    'reports what bpmnlint reports for every %s config on every fixture',
    async (_engine, { compatRules, moddleExtensions }, compat, versions) => {
      const layer = new EngineLayer(compat);
      const resolver = new StaticResolver({
        ...compat.resolverEntries,
        'rule:bpmnlint/start-event-required': startEventRequired,
      });
      for (const file of bpmnFiles(FIXTURES)) {
        const { root } = await createModdle(
          readFileSync(file, 'utf8'),
          undefined,
          moddleExtensions,
        );
        for (const version of versions) {
          const expected = await new Linter({ resolver }).lint(root, layer.config(version));
          expect(lint(root, compatRules(version))).toEqual(expected);
        }
      }
    },
  );

  it('skips the children of an element only for the rule that returned false', async () => {
    const { root } = await createModdle(TWO_TASKS);
    const rules = { 'test/visited-ids': 'warn', 'test/enter-and-leave': 'error' } as const;
    const expected = await new Linter({ resolver: RESOLVER }).lint(root, { rules });

    expect(lint(root, entriesOf(rules))).toEqual(expected);
    expect(expected['test/visited-ids']).toEqual([
      expect.objectContaining({ id: 'outer_test', category: 'warn' }),
    ]);
    expect(expected['test/enter-and-leave']).toHaveLength(3);
  });

  it('reports a rule that throws as one rule-error and runs the others on', async () => {
    const { root } = await createModdle(TWO_TASKS);
    const rules = { 'test/throws-on-task': 'error', 'test/visited-ids': 'warn' } as const;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const expected = await new Linter({ resolver: RESOLVER }).lint(root, { rules });
    errorSpy.mockRestore();

    expect(lint(root, entriesOf(rules))).toEqual(expected);
    expect(expected['test/throws-on-task']).toEqual([
      { message: 'broken rule', category: 'rule-error' },
    ]);
  });

  it("runs a host's engine rules with camunda-compat's, told the version", async () => {
    const { root } = await createModdle(C8_SERVICE_TASK_WITHOUT_TYPE, { zeebe: zeebeModdle });
    const reports = lint(root, [
      ...camunda8.compatRules('8.6'),
      {
        name: 'host/task-without-name',
        category: 'warn',
        rule: taskWithoutName({ version: '8.6' }),
      },
    ]);

    expect(reports['host/task-without-name']).toEqual([
      expect.objectContaining({ id: 'serviceTask_test', category: 'warn', path: ['name'] }),
    ]);
    expect(reports['camunda-compat/implementation']).toEqual([
      expect.objectContaining({ id: 'serviceTask_test', category: 'error' }),
    ]);
  });
});
