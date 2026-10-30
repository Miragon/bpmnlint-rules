import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/flow-id-names-ends';
import { model } from '../support/model';

const flowBetween = (id: string, target = 'endEvent_done', targetName?: string) =>
  model({
    shapes: [
      { id: 'serviceTask_checkInvoice', tag: 'serviceTask', name: 'Check invoice' },
      { id: target, tag: 'endEvent', ...(targetName ? { name: targetName } : {}) },
    ],
    edges: [{ id, source: 'serviceTask_checkInvoice', target }],
  });

verify('flow-id-names-ends', rule, {
  valid: [
    { name: 'names both ends by id', moddleElement: flowBetween('flow_checkInvoiceToDone') },
    { name: 'collision suffix', moddleElement: flowBetween('flow_checkInvoiceToDone_2') },
    { name: 'glued collision suffix', moddleElement: flowBetween('flow_checkInvoiceToDoneNo2') },
    { name: 'ends cut short', moddleElement: flowBetween('flow_checkToDo') },
    {
      name: 'target named by its name',
      moddleElement: flowBetween('flow_checkInvoiceToInvoicePaid', 'endEvent_1', 'Invoice paid'),
    },
    { name: 'not the speaking form', moddleElement: flowBetween('flow_approved') },
    { name: 'generated id', moddleElement: flowBetween('Flow_0yq6cfd') },
    { name: 'target named by its kind', moddleElement: flowBetween('flow_checkInvoiceToEndEvent') },
    { name: 'starts with to', moddleElement: flowBetween('flow_toDone') },
  ],
  invalid: [
    {
      name: 'target drifted',
      moddleElement: flowBetween('flow_checkInvoiceToDone', 'endEvent_rejected'),
      report: {
        id: 'flow_checkInvoiceToDone',
        message:
          'Flow id does not name its source and target, expected e.g. flow_checkInvoiceToRejected',
      },
    },
    {
      name: 'source drifted',
      moddleElement: flowBetween('flow_reviewOrderToDone'),
      report: {
        id: 'flow_reviewOrderToDone',
        message:
          'Flow id does not name its source and target, expected e.g. flow_checkInvoiceToDone',
      },
    },
  ],
});
