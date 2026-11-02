import { createModdle } from 'bpmnlint/lib/testers/helper';

import { EngineTarget } from '../../src/lib/engine/EngineTarget';

const definitions = async (attributes: string) =>
  (
    await createModdle(`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:modeler="http://camunda.org/schema/modeler/1.0" ${attributes}
    id="definitions_test" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="process_test" />
</bpmn:definitions>`)
  ).root as any;

const ZEEBE = 'xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"';
const CAMUNDA = 'xmlns:camunda="http://camunda.org/schema/1.0/bpmn"';

describe('EngineTarget', () => {
  it('reads the engine and minor version from modeler:executionPlatform[Version]', async () => {
    const root = await definitions(
      'modeler:executionPlatform="Camunda Cloud" modeler:executionPlatformVersion="8.9.2"',
    );
    const target = EngineTarget.forElement(root.rootElements[0]);
    expect(target.engine).toBe('c8');
    expect(target.version).toBe('8.9');
  });

  it.each([
    ['Camunda Platform', 'c7'],
    ['Operaton', 'c7'],
    ['CIB seven', 'c7'],
    ['Camunda 8', 'c8'],
    ['Zeebe', 'c8'],
  ])('reads %s as %s', async (platform, engine) => {
    const root = await definitions(`modeler:executionPlatform="${platform}"`);
    expect(EngineTarget.forElement(root).engine).toBe(engine);
  });

  it('falls back to the one vendor namespace the file declares', async () => {
    expect(EngineTarget.forElement(await definitions(ZEEBE)).engine).toBe('c8');
    expect(EngineTarget.forElement(await definitions(CAMUNDA)).engine).toBe('c7');
  });

  it('targets no engine for both namespaces, or none', async () => {
    expect(
      EngineTarget.forElement(await definitions(`${ZEEBE} ${CAMUNDA}`)).engine,
    ).toBeUndefined();
    expect(EngineTarget.forElement(await definitions('')).engine).toBeUndefined();
  });

  it('compares versions by major and minor, a missing version being the latest', async () => {
    const versioned = EngineTarget.forElement(
      await definitions(
        'modeler:executionPlatform="Camunda Cloud" modeler:executionPlatformVersion="8.9.0"',
      ),
    );
    expect(versioned.isAtLeast('8.9')).toBe(true);
    expect(versioned.isAtLeast('8.10')).toBe(false);
    expect(EngineTarget.forElement(await definitions(ZEEBE)).isAtLeast('8.10')).toBe(true);
  });
});
