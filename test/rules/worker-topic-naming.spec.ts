import { verify } from 'bpmnlint/lib/testers/rule-tester';

import { moddleExtension as camundaModdleExtension } from '../../src/rules/camunda-7';
import { moddleExtension as zeebeModdleExtension } from '../../src/rules/camunda-8';
import rule from '../../src/rules/miragon/worker-topic-naming';
import { model as buildModel } from '../support/model';
import type { ModelSpec, ShapeSpec } from '../support/model';

const ENGINE_NAMESPACES = {
  'xmlns:camunda': 'http://camunda.org/schema/1.0/bpmn',
  'xmlns:operaton': 'http://operaton.org/schema/1.0/bpmn',
  'xmlns:zeebe': 'http://camunda.org/schema/zeebe/1.0',
};

const model = (spec: ModelSpec) =>
  buildModel({ ...spec, definitionsAttributes: ENGINE_NAMESPACES });

const camundaModdle = {
  [camundaModdleExtension.prefix]: camundaModdleExtension.descriptor,
};
const zeebeModdle = { [zeebeModdleExtension.prefix]: zeebeModdleExtension.descriptor };

const external = (topic: string) => ({ 'camunda:type': 'external', 'camunda:topic': topic });

/** A Camunda 7 external service task with this topic. */
const externalTask = (topic: string): ShapeSpec => ({
  id: 'serviceTask_validate',
  tag: 'serviceTask',
  attributes: external(topic),
});

/** A Camunda 8 service task with this job type. */
const zeebeTask = (jobType: string): ShapeSpec => ({
  id: 'serviceTask_validate',
  tag: 'serviceTask',
  extensionElements: `<zeebe:taskDefinition type="${jobType}" />`,
});

const BILLING = { prefix: 'billing', separator: '.', case: 'camelCase' };

const reportOn = (topic: string, convention: string, id = 'serviceTask_validate') => ({
  id,
  message: `Worker topic <${topic}> must match ${convention}`,
});

verify('worker-topic-naming', rule, {
  valid: [
    {
      name: 'a camelCase topic follows the default scheme',
      moddleElement: model({ shapes: [externalTask('validateInvoice')] }),
    },
    {
      name: 'a namespaced topic follows the default scheme',
      moddleElement: model({ shapes: [externalTask('billing.validateInvoice')] }),
    },
    {
      name: 'a topic follows the configured prefix, separator and case',
      config: BILLING,
      moddleElement: model({
        shapes: [
          externalTask('billing.validateInvoice'),
          {
            id: 'businessRuleTask_rate',
            tag: 'businessRuleTask',
            attributes: external('billing.rateInvoice'),
          },
          {
            id: 'sendTask_notify',
            tag: 'sendTask',
            attributes: external('billing.notifyCustomer'),
          },
          {
            id: 'endEvent_invoiceSent',
            tag: 'endEvent',
            eventDefinitions: ['message'],
            eventDefinitionAttributes: external('billing.sendInvoice'),
          },
        ],
      }),
    },
    {
      name: 'two segments pass with segments 2',
      config: { segments: 2 },
      moddleElement: model({ shapes: [externalTask('billing.validateInvoice')] }),
    },
    {
      name: 'a kebab-case topic follows a kebab-case scheme',
      config: { case: 'kebab-case' },
      moddleElement: model({ shapes: [externalTask('validate-invoice')] }),
    },
    {
      name: 'an operaton external task is read from its own namespace',
      moddleElement: model({
        shapes: [
          {
            id: 'serviceTask_validate',
            tag: 'serviceTask',
            attributes: { 'operaton:type': 'external', 'operaton:topic': 'validateInvoice' },
          },
        ],
      }),
    },
    {
      name: 'a Camunda 8 job type follows the scheme',
      config: { segments: 2 },
      moddleElement: model({ shapes: [zeebeTask('billing.validateInvoice')] }),
    },
    {
      name: 'a Camunda 8 job type passes with the zeebe moddle extension loaded',
      config: { segments: 2 },
      moddleElement: model({
        moddleExtensions: zeebeModdle,
        shapes: [zeebeTask('billing.validateInvoice')],
      }),
    },
    {
      name: 'a matching topic passes with the camunda moddle extension loaded',
      moddleElement: model({
        moddleExtensions: camundaModdle,
        shapes: [externalTask('validateInvoice')],
      }),
    },
    {
      // Resolved by the engine at runtime: there is no fixed topic to check.
      name: 'an expression is not checked',
      moddleElement: model({
        shapes: [
          externalTask('${topicName}'),
          { ...zeebeTask('=concat("billing.", kind)'), id: 'serviceTask_rate' },
          { ...externalTask('billing.#{tenant}'), id: 'serviceTask_notify' },
        ],
      }),
    },
    {
      // A missing topic is a deploy error the engine layer reports, not a naming finding.
      name: 'an external task without a topic is not checked',
      moddleElement: model({
        shapes: [
          {
            id: 'serviceTask_validate',
            tag: 'serviceTask',
            attributes: { 'camunda:type': 'external' },
          },
        ],
      }),
    },
    {
      // `camunda:topic` only means something on an external task implementation.
      name: 'a topic on a task that is not external is not checked',
      moddleElement: model({
        shapes: [
          {
            id: 'serviceTask_validate',
            tag: 'serviceTask',
            attributes: { 'camunda:class': 'io.miragon.Validate', 'camunda:topic': 'Not-A-Topic' },
          },
        ],
      }),
    },
    {
      name: 'an element type that cannot be an external task is not checked',
      moddleElement: model({
        shapes: [{ id: 'userTask_validate', tag: 'userTask', attributes: external('Not-A-Topic') }],
      }),
    },
    {
      name: 'only message event definitions carry an external task',
      moddleElement: model({
        shapes: [
          {
            id: 'endEvent_failed',
            tag: 'endEvent',
            eventDefinitions: ['error'],
            eventDefinitionAttributes: external('Not-A-Topic'),
          },
        ],
      }),
    },
  ],
  invalid: [
    {
      name: 'a topic off the default camelCase scheme',
      moddleElement: model({ shapes: [externalTask('validate-invoice')] }),
      report: reportOn('validate-invoice', '<camelCase>'),
    },
    {
      name: 'a topic without the configured prefix',
      config: BILLING,
      moddleElement: model({ shapes: [externalTask('validate-invoice')] }),
      report: reportOn('validate-invoice', 'billing.<camelCase>'),
    },
    {
      name: 'a topic with the prefix but the wrong case',
      config: BILLING,
      moddleElement: model({ shapes: [externalTask('billing.ValidateInvoice')] }),
      report: reportOn('billing.ValidateInvoice', 'billing.<camelCase>'),
    },
    {
      name: 'a topic with the prefix but another separator',
      config: BILLING,
      moddleElement: model({ shapes: [externalTask('billing-validateInvoice')] }),
      report: reportOn('billing-validateInvoice', 'billing.<camelCase>'),
    },
    {
      name: 'one segment where segments 2 asks for two',
      config: { segments: 2 },
      moddleElement: model({ shapes: [externalTask('validateInvoice')] }),
      report: reportOn('validateInvoice', '<camelCase>.<camelCase>'),
    },
    {
      name: 'three segments where segments 2 asks for two',
      config: { segments: 2 },
      moddleElement: model({ shapes: [externalTask('billing.invoice.validate')] }),
      report: reportOn('billing.invoice.validate', '<camelCase>.<camelCase>'),
    },
    {
      name: 'an unknown case falls back to PascalCase',
      config: { case: 'camelcase' },
      moddleElement: model({ shapes: [externalTask('validateInvoice')] }),
      report: reportOn('validateInvoice', '<PascalCase>'),
    },
    {
      name: 'a message event definition is reported on its event',
      moddleElement: model({
        shapes: [
          {
            id: 'endEvent_invoiceSent',
            tag: 'endEvent',
            eventDefinitions: ['message'],
            eventDefinitionAttributes: external('send-invoice'),
          },
        ],
      }),
      report: reportOn('send-invoice', '<camelCase>', 'endEvent_invoiceSent'),
    },
    {
      name: 'an operaton external task off the scheme',
      moddleElement: model({
        shapes: [
          {
            id: 'serviceTask_validate',
            tag: 'serviceTask',
            attributes: { 'operaton:type': 'external', 'operaton:topic': 'validate-invoice' },
          },
        ],
      }),
      report: reportOn('validate-invoice', '<camelCase>'),
    },
    {
      name: 'a topic off the scheme with the camunda moddle extension loaded',
      moddleElement: model({
        moddleExtensions: camundaModdle,
        shapes: [externalTask('validate-invoice')],
      }),
      report: reportOn('validate-invoice', '<camelCase>'),
    },
    {
      name: 'a Camunda 8 job type off the scheme',
      config: { segments: 2 },
      moddleElement: model({ shapes: [zeebeTask('claim-membership')] }),
      report: reportOn('claim-membership', '<camelCase>.<camelCase>'),
    },
    {
      name: 'a Camunda 8 job type off the scheme with the zeebe moddle extension loaded',
      config: { segments: 2 },
      moddleElement: model({
        moddleExtensions: zeebeModdle,
        shapes: [zeebeTask('claim-membership')],
      }),
      report: reportOn('claim-membership', '<camelCase>.<camelCase>'),
    },
  ],
});
