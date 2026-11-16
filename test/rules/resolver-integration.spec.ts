import Linter from 'bpmnlint/lib/linter';
import { createModdle } from 'bpmnlint/lib/testers/helper';
import camundaCompat from 'bpmnlint-plugin-camunda-compat';
import zeebeModdle from 'zeebe-bpmn-moddle/resources/zeebe.json';

import {
  createBundledResolver,
  getDefaultLintConfig,
  miragonRecommendedForAutomation,
  miragonRecommendedForModeling,
  miragonRuleFactories,
  miragonStrict,
} from '../../src';
import type { BpmnlintConfig, DefaultLintConfigOptions, Engine } from '../../src';
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

  it('keeps every engine-specific Miragon rule off in both recommended presets', () => {
    const engineSpecificRuleNames = Object.entries(miragonRuleFactories)
      .filter(([, factory]) => factory.targetEngine)
      .map(([name]) => `@miragon/rules/${name}`);

    expect(engineSpecificRuleNames).not.toHaveLength(0);
    for (const ruleName of engineSpecificRuleNames) {
      expect(miragonRecommendedForModeling.rules?.[ruleName]).toBe('off');
      expect(miragonRecommendedForAutomation.rules?.[ruleName]).toBe('off');
    }
  });

  it('keeps text-annotation-fit as the only Miragon rule off in every preset, strict included', () => {
    const offEverywhere = Object.keys(miragonRuleFactories)
      .map((name) => `@miragon/rules/${name}`)
      .filter((ruleName) =>
        [miragonRecommendedForModeling, miragonRecommendedForAutomation, miragonStrict].every(
          (layer) => layer.rules?.[ruleName] === 'off',
        ),
      );

    expect(offEverywhere).toEqual(['@miragon/rules/text-annotation-fit']);
  });

  it('marks exactly the rules with a target engine as engine-specific', () => {
    for (const factory of Object.values(miragonRuleFactories)) {
      expect(factory.kind === 'engine-specific').toBe(Boolean(factory.targetEngine));
    }
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

describe('getDefaultLintConfig engine version', () => {
  const engineLayerOf = (options: DefaultLintConfigOptions): string | undefined =>
    extendsOf(options).find((layer) => layer.startsWith('plugin:camunda-compat/'));

  it('picks the camunda-compat config of the version the diagram targets', () => {
    expect(engineLayerOf({ engine: 'c8', engineVersion: '8.7.0' })).toBe(
      'plugin:camunda-compat/camunda-cloud-8-7',
    );
    expect(engineLayerOf({ engine: 'c8', engineVersion: '1.3.0' })).toBe(
      'plugin:camunda-compat/camunda-cloud-1-3',
    );
    expect(engineLayerOf({ engine: 'c7', engineVersion: '7.21.0' })).toBe(
      'plugin:camunda-compat/camunda-platform-7-21',
    );
  });

  it('falls back to the latest config when no bundled config matches the version', () => {
    expect(engineLayerOf({ engine: 'c8' })).toBe('plugin:camunda-compat/camunda-cloud-8-11');
    for (const engineVersion of ['', 'latest', '8', '9.0.0', '8.99.0', '0.26.0']) {
      expect(engineLayerOf({ engine: 'c8', engineVersion }), `version ${engineVersion}`).toBe(
        'plugin:camunda-compat/camunda-cloud-8-11',
      );
    }
    expect(engineLayerOf({ engine: 'c7', engineVersion: '7.15.0' })).toBe(
      'plugin:camunda-compat/camunda-platform-7-24',
    );
    expect(engineLayerOf({ engine: 'c7', engineVersion: '8.7.0' })).toBe(
      'plugin:camunda-compat/camunda-platform-7-24',
    );
  });

  it('resolves every versioned camunda-compat config from the bundle alone', () => {
    const resolver = createBundledResolver();
    const configNames = Object.keys(camundaCompat.configs).filter((name) => name !== 'all');

    for (const configName of configNames) {
      expect(
        resolver.resolveConfig('bpmnlint-plugin-camunda-compat', configName),
        configName,
      ).toBeDefined();
    }
  });
});

describe('linting an 8.7 diagram with the bundle alone', () => {
  const SECRET_IN_INPUT = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"
    xmlns:modeler="http://camunda.org/schema/modeler/1.0"
    id="definitions_secret" targetNamespace="http://bpmn.io/schema/bpmn"
    modeler:executionPlatform="Camunda Cloud" modeler:executionPlatformVersion="8.7.0">
  <bpmn:process id="process_secret" isExecutable="true">
    <bpmn:serviceTask id="serviceTask_callApi">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="call-api" />
        <zeebe:ioMapping>
          <zeebe:input source="{{secrets.MY_SECRET}}" target="token" />
        </zeebe:ioMapping>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
  </bpmn:process>
</bpmn:definitions>`;

  async function lintResults(config: BpmnlintConfig): Promise<Record<string, unknown[]>> {
    const { root } = await createModdle(SECRET_IN_INPUT, config.moddleExtensions);
    const linter = new Linter({ config, resolver: createBundledResolver() });
    return (await linter.lint(root)) as Record<string, unknown[]>;
  }

  it('reports the legacy secret format against the latest config', async () => {
    const results = await lintResults(getDefaultLintConfig({ engine: 'c8' }));
    expect(results['camunda-compat/secrets']).not.toHaveLength(0);
  });

  it('keeps the 8.7 secret format clean when the default targets 8.7', async () => {
    const results = await lintResults(
      getDefaultLintConfig({ engine: 'c8', engineVersion: '8.7.0' }),
    );
    expect(results).not.toHaveProperty(['camunda-compat/secrets']);
  });

  it('keeps the 8.7 secret format clean when a config names camunda-cloud-8-7', async () => {
    const results = await lintResults({
      extends: 'plugin:camunda-compat/camunda-cloud-8-7',
      moddleExtensions: { zeebe: zeebeModdle },
    });
    expect(results).toHaveProperty(['start-event-required']);
    expect(results).not.toHaveProperty(['camunda-compat/secrets']);
  });
});
