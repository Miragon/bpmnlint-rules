import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import Linter from 'bpmnlint/lib/linter';
import { createModdle } from 'bpmnlint/lib/testers/helper';

import type * as BpmnlintRules from '../../../src';

const {
  all,
  createBundledResolver,
  getDefaultLintConfig,
  miragonAll,
  miragonRecommendedForAutomation,
  miragonRecommendedForModeling,
  miragonRuleFactories,
} = createRequire(import.meta.url)('../../../dist/index.cjs') as typeof BpmnlintRules;

export type Severity = 'off' | 'warn' | 'error';

export interface Finding {
  id: string;
  message: string;
  rule: string;
  category: string;
}

export interface RuleDoc {
  name: string;
  catches: string;
  category: 'naming' | 'layout';
  severities: Record<'modeling' | 'automation' | 'all', Severity>;
  findings: Finding[];
}

export interface RulesData {
  rules: RuleDoc[];
  standardSize: RuleDoc['severities'];
  undeployable: Finding[];
  deployable: Finding[];
}

const MIRAGON_NAME = '@miragon/rules';

declare const data: RulesData;
export { data };

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const readmePath = `${repositoryRoot}README.md`;
const fixturesPath = `${repositoryRoot}test/fixtures/rules`;

const TASK_DEFINITION = `
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="review-order" />
      </bpmn:extensionElements>`;

const buildOrderModel = (serviceTaskExtension: string) => `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:zeebe="http://camunda.org/schema/zeebe/1.0" xmlns:modeler="http://camunda.org/schema/modeler/1.0" id="definitions_order" targetNamespace="http://bpmn.io/schema/bpmn" modeler:executionPlatform="Camunda Cloud" modeler:executionPlatformVersion="8.10.0">
  <bpmn:process id="process_order" isExecutable="true">
    <bpmn:startEvent id="startEvent_orderReceived" name="Order received">
      <bpmn:outgoing>flow_orderReceived</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:serviceTask id="serviceTask_reviewOrder" name="Review order">${serviceTaskExtension}
      <bpmn:incoming>flow_orderReceived</bpmn:incoming>
      <bpmn:outgoing>flow_orderReviewed</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="endEvent_orderReviewed" name="Order reviewed">
      <bpmn:incoming>flow_orderReviewed</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="flow_orderReceived" sourceRef="startEvent_orderReceived" targetRef="serviceTask_reviewOrder" />
    <bpmn:sequenceFlow id="flow_orderReviewed" sourceRef="serviceTask_reviewOrder" targetRef="endEvent_orderReviewed" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="diagram_order">
    <bpmndi:BPMNPlane id="plane_order" bpmnElement="process_order">
      <bpmndi:BPMNShape id="startEvent_orderReceived_di" bpmnElement="startEvent_orderReceived">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="serviceTask_reviewOrder_di" bpmnElement="serviceTask_reviewOrder">
        <dc:Bounds x="240" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="endEvent_orderReviewed_di" bpmnElement="endEvent_orderReviewed">
        <dc:Bounds x="392" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="flow_orderReceived_di" bpmnElement="flow_orderReceived">
        <di:waypoint x="188" y="120" />
        <di:waypoint x="240" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="flow_orderReviewed_di" bpmnElement="flow_orderReviewed">
        <di:waypoint x="340" y="120" />
        <di:waypoint x="392" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

type LintResults = Record<string, { id: string; message: string; category: string }[]>;

function flatten(results: LintResults): Finding[] {
  return Object.entries(results).flatMap(([rule, reports]) =>
    reports.map(({ id, message, category }) => ({ id, message, category, rule })),
  );
}

function readCatchesByRule(): Map<string, string> {
  const rowPattern = /^\| \[`@miragon\/rules\/([a-z-]+)`\]\([^)]*\)\s*\| (.+?)\s*\|$/gm;
  const readme = readFileSync(readmePath, 'utf8');
  return new Map(
    [...readme.matchAll(rowPattern)].map(([, name, catches]) => [
      name!,
      catches!.replaceAll('`', ''),
    ]),
  );
}

type RuleConfig = { rules?: Record<string, unknown> };

function severityOf(config: RuleConfig, qualifiedRuleName: string): Severity {
  return (config.rules?.[qualifiedRuleName] ?? 'off') as Severity;
}

function severitiesOf(qualifiedRuleName: string): RuleDoc['severities'] {
  return {
    modeling: severityOf(miragonRecommendedForModeling, qualifiedRuleName),
    automation: severityOf(miragonRecommendedForAutomation, qualifiedRuleName),
    all: severityOf(miragonAll, qualifiedRuleName),
  };
}

async function lintInvalidFixture(ruleName: string): Promise<Finding[]> {
  const xml = readFileSync(`${fixturesPath}/${ruleName}/invalid.bpmn`, 'utf8');
  const { root } = await createModdle(xml);
  const linter = new Linter({ resolver: createBundledResolver() });
  const ownRule = `${MIRAGON_NAME}/${ruleName}`;
  return flatten((await linter.lint(root, all)) as LintResults).filter(
    ({ rule }) => rule === ownRule,
  );
}

async function lintForCamunda8(xml: string): Promise<Finding[]> {
  const config = getDefaultLintConfig({ engine: 'c8' });
  const { root } = await createModdle(xml, config.moddleExtensions);
  const linter = new Linter({ config, resolver: createBundledResolver() });
  return flatten((await linter.lint(root)) as LintResults);
}

export default {
  watch: ['../../../README.md', '../../../dist/index.cjs'],
  async load(): Promise<RulesData> {
    const catchesByRule = readCatchesByRule();
    const rules = await Promise.all(
      Object.keys(miragonRuleFactories).map(async (name): Promise<RuleDoc> => {
        const severities = severitiesOf(`${MIRAGON_NAME}/${name}`);
        return {
          name,
          catches: catchesByRule.get(name) ?? '',
          category: severities.modeling === 'off' ? 'naming' : 'layout',
          severities,
          findings: await lintInvalidFixture(name),
        };
      }),
    );
    return {
      rules,
      standardSize: severitiesOf('bpmnlint/standard-size'),
      undeployable: await lintForCamunda8(buildOrderModel('')),
      deployable: await lintForCamunda8(buildOrderModel(TASK_DEFINITION)),
    };
  },
};
