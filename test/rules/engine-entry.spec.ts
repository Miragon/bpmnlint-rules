import Linter from 'bpmnlint/lib/linter';
import { createModdle } from 'bpmnlint/lib/testers/helper';
import zeebeModdle from 'zeebe-bpmn-moddle/resources/zeebe.json';

import { camunda7 } from '../../src/camunda-7';
import { camunda8 } from '../../src/camunda-8';

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

describe('per-engine entry points', () => {
  it('lints a Camunda 8 file with camunda-compat for the configured version', async () => {
    const { root } = await createModdle(C8_SERVICE_TASK_WITHOUT_TYPE, { zeebe: zeebeModdle });
    const linter = new Linter({ resolver: camunda8.createResolver() });
    const reports = await linter.lint(root, camunda8.lintConfig('8.6'));

    expect(reports['camunda-compat/implementation']).toEqual([
      expect.objectContaining({ id: 'serviceTask_test', category: 'error' }),
    ]);
  });

  it.each([
    ['c7', camunda7, ['7.19', '7.24']],
    ['c8', camunda8, ['8.0', '8.10']],
  ] as const)(
    'resolves every %s version config with its own resolver',
    async (_engine, lint, versions) => {
      const { root } = await createModdle(C8_SERVICE_TASK_WITHOUT_TYPE);
      for (const version of versions) {
        const linter = new Linter({ resolver: lint.createResolver() });
        await expect(linter.lint(root, lint.lintConfig(version))).resolves.toBeDefined();
      }
    },
  );
});
