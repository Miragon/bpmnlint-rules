import { createModdle } from 'bpmnlint/lib/testers/helper';

import { ElementIdConvention } from '../../src/lib/naming/ElementIdConvention';

const timerStartEvent = async () =>
  (
    await createModdle(`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="definitions_test"
    targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="process_test">
    <bpmn:startEvent id="x"><bpmn:timerEventDefinition id="timer" /></bpmn:startEvent>
  </bpmn:process>
</bpmn:definitions>`)
  ).root as any;

describe('ElementIdConvention for a host writing ids', () => {
  it('names the prefix and the configured type it comes from', async () => {
    const event = (await timerStartEvent()).rootElements[0].flowElements[0];
    expect(new ElementIdConvention().prefixFor(event)).toEqual({
      type: 'bpmn:StartEvent',
      prefix: 'startEvent_',
    });
    expect(
      new ElementIdConvention({ prefixes: { 'bpmn:StartEvent': false } }).prefixFor(event),
    ).toBeNull();
  });

  it('lists the prefixes the qualifier mode accepts', async () => {
    const event = (await timerStartEvent()).rootElements[0].flowElements[0];
    expect(
      new ElementIdConvention({ eventDefinitionQualifier: 'required' }).acceptedPrefixes(
        event,
        'startEvent_',
      ),
    ).toEqual(['timerStartEvent_']);
  });
});
