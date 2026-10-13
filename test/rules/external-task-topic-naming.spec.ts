import { verify } from 'bpmnlint/lib/testers/rule-tester';

import { moddleExtension } from '../../src/rules/camunda-7';
import rule from '../../src/rules/miragon/external-task-topic-naming';
import { model } from '../support/model';

const external = (topic: string) => ({ 'camunda:type': 'external', 'camunda:topic': topic });

const BILLING = { prefix: 'billing', separator: '.', case: 'camelCase' };

const camundaModdle = { [moddleExtension.prefix]: moddleExtension.descriptor };

verify('external-task-topic-naming', rule, {
  valid: [
    {
      name: 'a camelCase topic follows the default scheme',
      moddleElement: model({
        shapes: [
          { id: 'serviceTask_validate', tag: 'serviceTask', attrs: external('validateInvoice') },
        ],
      }),
    },
    {
      name: 'a namespaced topic follows the default scheme',
      moddleElement: model({
        shapes: [
          {
            id: 'serviceTask_validate',
            tag: 'serviceTask',
            attrs: external('billing.validateInvoice'),
          },
        ],
      }),
    },
    {
      name: 'a topic follows the configured prefix, separator and case',
      config: BILLING,
      moddleElement: model({
        shapes: [
          {
            id: 'serviceTask_validate',
            tag: 'serviceTask',
            attrs: external('billing.validateInvoice'),
          },
          {
            id: 'businessRuleTask_rate',
            tag: 'businessRuleTask',
            attrs: external('billing.rateInvoice'),
          },
          { id: 'sendTask_notify', tag: 'sendTask', attrs: external('billing.notifyCustomer') },
          {
            id: 'endEvent_invoiceSent',
            tag: 'endEvent',
            eventDefinitions: ['message'],
            eventDefinitionAttrs: external('billing.sendInvoice'),
          },
        ],
      }),
    },
    {
      name: 'a kebab-case topic follows a kebab-case scheme',
      config: { case: 'kebab-case' },
      moddleElement: model({
        shapes: [
          { id: 'serviceTask_validate', tag: 'serviceTask', attrs: external('validate-invoice') },
        ],
      }),
    },
    {
      name: 'an operaton external task is read from its own namespace',
      moddleElement: model({
        shapes: [
          {
            id: 'serviceTask_validate',
            tag: 'serviceTask',
            attrs: { 'operaton:type': 'external', 'operaton:topic': 'validateInvoice' },
          },
        ],
      }),
    },
    {
      // A missing topic is a deploy error the engine layer reports, not a naming finding.
      name: 'an external task without a topic is not checked',
      moddleElement: model({
        shapes: [
          { id: 'serviceTask_validate', tag: 'serviceTask', attrs: { 'camunda:type': 'external' } },
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
            attrs: { 'camunda:class': 'io.miragon.Validate', 'camunda:topic': 'Not-A-Topic' },
          },
        ],
      }),
    },
    {
      name: 'an element type that cannot be an external task is not checked',
      moddleElement: model({
        shapes: [{ id: 'userTask_validate', tag: 'userTask', attrs: external('Not-A-Topic') }],
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
            eventDefinitionAttrs: external('Not-A-Topic'),
          },
        ],
      }),
    },
    {
      name: 'a matching topic passes with the camunda moddle extension loaded',
      moddleElement: model({
        moddleExtensions: camundaModdle,
        shapes: [
          { id: 'serviceTask_validate', tag: 'serviceTask', attrs: external('validateInvoice') },
        ],
      }),
    },
  ],
  invalid: [
    {
      name: 'a topic off the default camelCase scheme',
      moddleElement: model({
        shapes: [
          { id: 'serviceTask_validate', tag: 'serviceTask', attrs: external('validate-invoice') },
        ],
      }),
      report: {
        id: 'serviceTask_validate',
        message: 'External task topic must match the naming convention <<camelCase>>',
      },
    },
    {
      name: 'a topic without the configured prefix',
      config: BILLING,
      moddleElement: model({
        shapes: [
          { id: 'serviceTask_validate', tag: 'serviceTask', attrs: external('validate-invoice') },
        ],
      }),
      report: {
        id: 'serviceTask_validate',
        message: 'External task topic must match the naming convention <billing.<camelCase>>',
      },
    },
    {
      name: 'a topic with the prefix but the wrong case',
      config: BILLING,
      moddleElement: model({
        shapes: [
          {
            id: 'serviceTask_validate',
            tag: 'serviceTask',
            attrs: external('billing.ValidateInvoice'),
          },
        ],
      }),
      report: {
        id: 'serviceTask_validate',
        message: 'External task topic must match the naming convention <billing.<camelCase>>',
      },
    },
    {
      name: 'a topic with the prefix but another separator',
      config: BILLING,
      moddleElement: model({
        shapes: [
          {
            id: 'serviceTask_validate',
            tag: 'serviceTask',
            attrs: external('billing-validateInvoice'),
          },
        ],
      }),
      report: {
        id: 'serviceTask_validate',
        message: 'External task topic must match the naming convention <billing.<camelCase>>',
      },
    },
    {
      name: 'an unknown case falls back to PascalCase',
      config: { case: 'camelcase' },
      moddleElement: model({
        shapes: [
          { id: 'serviceTask_validate', tag: 'serviceTask', attrs: external('validateInvoice') },
        ],
      }),
      report: {
        id: 'serviceTask_validate',
        message: 'External task topic must match the naming convention <<PascalCase>>',
      },
    },
    {
      name: 'a message event definition is reported on its event',
      moddleElement: model({
        shapes: [
          {
            id: 'endEvent_invoiceSent',
            tag: 'endEvent',
            eventDefinitions: ['message'],
            eventDefinitionAttrs: external('send-invoice'),
          },
        ],
      }),
      report: {
        id: 'endEvent_invoiceSent',
        message: 'External task topic must match the naming convention <<camelCase>>',
      },
    },
    {
      name: 'an operaton external task off the scheme',
      moddleElement: model({
        shapes: [
          {
            id: 'serviceTask_validate',
            tag: 'serviceTask',
            attrs: { 'operaton:type': 'external', 'operaton:topic': 'validate-invoice' },
          },
        ],
      }),
      report: {
        id: 'serviceTask_validate',
        message: 'External task topic must match the naming convention <<camelCase>>',
      },
    },
    {
      name: 'a topic off the scheme with the camunda moddle extension loaded',
      moddleElement: model({
        moddleExtensions: camundaModdle,
        shapes: [
          { id: 'serviceTask_validate', tag: 'serviceTask', attrs: external('validate-invoice') },
        ],
      }),
      report: {
        id: 'serviceTask_validate',
        message: 'External task topic must match the naming convention <<camelCase>>',
      },
    },
  ],
});
