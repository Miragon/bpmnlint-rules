import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/message-name-naming';
import { model } from '../support/model';

const BILLING = { prefix: 'billing', separator: '.', case: 'camelCase' };

verify('message-name-naming', rule, {
  valid: [
    {
      name: 'a camelCase name follows the default scheme',
      moddleElement: model({
        messages: [{ id: 'message_paymentReceived', name: 'paymentReceived' }],
      }),
    },
    {
      name: 'a namespaced name follows the default scheme',
      moddleElement: model({
        messages: [{ id: 'message_paymentReceived', name: 'billing.paymentReceived' }],
      }),
    },
    {
      name: 'a name follows the configured prefix, separator and case',
      config: BILLING,
      moddleElement: model({
        messages: [{ id: 'message_paymentReceived', name: 'billing.paymentReceived' }],
      }),
    },
    {
      name: 'a kebab-case name follows a kebab-case scheme',
      config: { case: 'kebab-case' },
      moddleElement: model({
        messages: [{ id: 'message_paymentReceived', name: 'payment-received' }],
      }),
    },
    {
      // A message nothing can correlate is the engine's finding, not a naming one.
      name: 'a message without a name is not checked',
      moddleElement: model({ messages: [{ id: 'message_paymentReceived' }] }),
    },
    {
      name: 'the name of an element that is not a message is not checked',
      moddleElement: model({
        shapes: [{ id: 'serviceTask_validate', tag: 'serviceTask', name: 'Validate invoice' }],
      }),
    },
  ],
  invalid: [
    {
      name: 'a name off the default camelCase scheme',
      moddleElement: model({
        messages: [{ id: 'message_paymentReceived', name: 'Payment received' }],
      }),
      report: {
        id: 'message_paymentReceived',
        message: 'Message name must match the naming convention <<camelCase>>',
      },
    },
    {
      name: 'a name without the configured prefix',
      config: BILLING,
      moddleElement: model({
        messages: [{ id: 'message_paymentReceived', name: 'paymentReceived' }],
      }),
      report: {
        id: 'message_paymentReceived',
        message: 'Message name must match the naming convention <billing.<camelCase>>',
      },
    },
    {
      name: 'a name with the prefix but the wrong case',
      config: BILLING,
      moddleElement: model({
        messages: [{ id: 'message_paymentReceived', name: 'billing.PaymentReceived' }],
      }),
      report: {
        id: 'message_paymentReceived',
        message: 'Message name must match the naming convention <billing.<camelCase>>',
      },
    },
    {
      name: 'an unknown case falls back to PascalCase',
      config: { case: 'camelcase' },
      moddleElement: model({
        messages: [{ id: 'message_paymentReceived', name: 'paymentReceived' }],
      }),
      report: {
        id: 'message_paymentReceived',
        message: 'Message name must match the naming convention <<PascalCase>>',
      },
    },
  ],
});
