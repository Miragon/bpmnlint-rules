import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import rule from '../../../src/rules/miragon/camunda-7/c7-schema';
import { engineModel, verifyEngineRule } from '../../support/engine-model';

const TIMER = (attributes = '') =>
  `<bpmn:timerEventDefinition id="TDef" ${attributes}><bpmn:timeDuration xsi:type="bpmn:tFormalExpression">PT1H</bpmn:timeDuration></bpmn:timerEventDefinition>`;
/** Start -> `nodes` (each [id, xml]) -> End */
const chain = (nodes: Array<[string, string]>) => {
  const ids = ['Start', ...nodes.map(([id]) => id), 'End'];
  const flows = ids
    .slice(1)
    .map(
      (id, index) =>
        `<bpmn:sequenceFlow id="F${index}" sourceRef="${ids[index]}" targetRef="${id}" />`,
    );
  return [
    '<bpmn:startEvent id="Start" />',
    ...nodes.map(([, xml]) => xml),
    '<bpmn:endEvent id="End" />',
    ...flows,
  ].join('\n');
};
const DI_NAMESPACE = 'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"';
const plane = (attributes: string) =>
  `<bpmndi:BPMNDiagram id="Diagram_1"><bpmndi:BPMNPlane id="Plane_1" bpmnElement="process_test" ${attributes} /></bpmndi:BPMNDiagram>`;

const SUFFIX =
  'which the BPMN schema does not define; the engines validate the file against the schema and refuse it';
const report = (id: string, where: string, key: string, path: (string | number)[] = []) => ({
  id,
  message: `${where} has the attribute ${key}, ${SUFFIX}`,
  path: [...path, key],
  type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
});

verifyEngineRule('c7-schema', rule, {
  valid: [
    {
      name: 'prefixed vendor attributes and the BPMN attributes',
      moddleElement: engineModel(
        'c7',
        chain([['R', '<bpmn:businessRuleTask id="R" name="Decide" camunda:decisionRef="d1" />']]),
      ),
    },
    {
      name: 'an unprefixed camunda attribute on its own element type: the typed parse reads it as the camunda attribute, so the rule cannot see it',
      moddleElement: engineModel('c7', chain([['T', '<bpmn:userTask id="T" assignee="demo" />']])),
    },
    {
      name: 'an attribute of another namespace',
      moddleElement: engineModel('c7', chain([['T', '<bpmn:userTask id="T" other:flag="x" />']]), {
        definitionsAttributes: 'xmlns:other="http://example.com/other"',
      }),
    },
    {
      name: 'a Camunda 8 diagram',
      moddleElement: engineModel(
        'c8',
        chain([['R', '<bpmn:businessRuleTask id="R" calledDecision="d1" />']]),
      ),
    },
  ],
  invalid: [
    {
      name: 'unprefixed attributes on a task and on an event definition',
      moddleElement: engineModel(
        'c7',
        chain([
          ['R', '<bpmn:businessRuleTask id="R" calledDecision="d1" camunda:decisionRef="d1" />'],
          [
            'W',
            `<bpmn:intermediateCatchEvent id="W">${TIMER('foo="bar"')}</bpmn:intermediateCatchEvent>`,
          ],
        ]),
      ),
      report: [
        report('R', 'businessRuleTask R', 'calledDecision'),
        report('W', 'bpmn:TimerEventDefinition in W', 'foo', ['eventDefinitions', 0]),
      ],
    },
    {
      name: 'a camunda attribute without prefix on another element type',
      moddleElement: engineModel(
        'c7',
        chain([['X', '<bpmn:serviceTask id="X" camunda:expression="${true}" assignee="demo" />']]),
      ),
      report: report('X', 'serviceTask X', 'assignee'),
    },
    {
      name: 'an attribute on bpmn:definitions and on the diagram',
      moddleElement: engineModel('c7', chain([]), {
        definitionsAttributes: `bar="2" ${DI_NAMESPACE}`,
        roots: plane('foo="1"'),
      }),
      report: [
        report('definitions_test', 'definitions definitions_test', 'bar'),
        report('Plane_1', 'bPMNPlane Plane_1', 'foo'),
      ],
    },
    {
      name: 'an attribute on an element without id: reported on its nearest ancestor with one',
      moddleElement: engineModel(
        'c7',
        chain([
          [
            'W',
            '<bpmn:intermediateCatchEvent id="W"><bpmn:timerEventDefinition><bpmn:timeDuration xsi:type="bpmn:tFormalExpression" unit="h">PT1H</bpmn:timeDuration></bpmn:timerEventDefinition></bpmn:intermediateCatchEvent>',
          ],
        ]),
      ),
      report: report('W', 'bpmn:FormalExpression in W', 'unit', [
        'eventDefinitions',
        0,
        'timeDuration',
      ]),
    },
    {
      name: 'a multi-instance loop and a condition with attributes',
      moddleElement: engineModel(
        'c7',
        `<bpmn:startEvent id="Start" /><bpmn:userTask id="T"><bpmn:multiInstanceLoopCharacteristics id="Loop" parallel="yes" /></bpmn:userTask><bpmn:endEvent id="End" />
        <bpmn:sequenceFlow id="F0" sourceRef="Start" targetRef="T" />
        <bpmn:sequenceFlow id="F1" sourceRef="T" targetRef="End"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression" lang="x">\${a}</bpmn:conditionExpression></bpmn:sequenceFlow>`,
      ),
      report: [
        report('T', 'bpmn:MultiInstanceLoopCharacteristics in T', 'parallel', [
          'loopCharacteristics',
        ]),
        report('F1', 'bpmn:FormalExpression in F1', 'lang', ['conditionExpression']),
      ],
    },
    {
      name: 'an attribute in a non-executable process',
      moddleElement: engineModel('c7', chain([['T', '<bpmn:userTask id="T" foo="1" />']]), {
        processAttributes: 'isExecutable="false"',
      }),
      report: report('T', 'userTask T', 'foo'),
    },
    {
      name: 'an attribute in an ad-hoc sub-process',
      moddleElement: engineModel(
        'c7',
        chain([
          [
            'AH',
            '<bpmn:adHocSubProcess id="AH"><bpmn:userTask id="T" foo="1" /></bpmn:adHocSubProcess>',
          ],
        ]),
      ),
      report: report('T', 'userTask T', 'foo'),
    },
  ],
});
