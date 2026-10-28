import type { MiragonRuleName } from '../../src/rules/miragon';
import { reportedIds } from '../support/lint-file';

/**
 * Every Miragon rule ships a matched pair of example models under `test/fixtures/rules/<rule>/`,
 * rendered to SVG for its doc page by `npm run docs:examples`. These tests keep the pair honest:
 * the invalid model must trip the rule on the element the doc points at, and the valid model must
 * stay silent — so the "good" picture in the docs is genuinely clean, not merely plausible.
 */
const OFFENDER_BY_RULE: Record<MiragonRuleName, string> = {
  'no-generated-ids': 'Activity_0049ryx',
  'element-id-naming': 'ReviewOrder',
  'worker-topic-naming': 'serviceTask_reviewOrder',
  'message-name-naming': 'message_orderReceived',
  'flow-through-element': 'flow_reopen',
  'flow-connection-side': 'flow_toDecision',
  'flow-target-alignment': 'flow_archived',
  'flow-crossing': 'flow_orderRevised',
  'flow-orthogonal': 'flow_reject',
  'boundary-event-marker-overlap': 'event_orderCancelled',
  'exclusive-gateway-marker-visible': 'gateway_approved',
  'async-continuations': 'serviceTask_chargeCard',
  'c8-boundary-host': 'event_refundTimedOut',
  'c7-schema': 'serviceTask_chargeCard',
  'c7-definitions-extension': 'Definitions_SavePoints',
  'c7-event-gateway': 'gateway_paymentOutcome',
  'c7-exclusive-gateway': 'gateway_orderApproved',
  'c7-implicit-default-flow': 'gateway_orderApproved',
  'c7-complex-gateway': 'gateway_orderApproved',
  'c7-ad-hoc-sub-process': 'subProcess_approveOrder',
  'c7-empty-condition': 'flow_approved',
  'c7-implementation': 'serviceTask_chargeCard',
  'c7-history-time-to-live': 'orderPayment',
  'c7-attribute-value': 'serviceTask_chargeCard',
  'c7-message-implementation': 'endEvent_orderPaid',
  'c7-external-topic': 'serviceTask_chargeCard',
  'c7-bad-value': 'userTask_approveOrder',
  'c7-result-variable': 'serviceTask_chargeCard',
  'c7-binding-version': 'userTask_approveOrder',
  'c7-called-element': 'callActivity_chargeCard',
  'c7-form': 'userTask_approveOrder',
  'c7-multi-instance': 'serviceTask_chargeCard',
  'c7-script': 'scriptTask_chargeCard',
  'c8-event-definition': 'event_paymentReceived',
  'c8-link-event': 'event_toShippingWhenLate',
  'c8-ad-hoc-sub-process': 'startEvent_pickingStarted',
  'c8-event-gateway': 'gateway_paymentStatus',
  'c8-message': 'event_paymentReceivedByTransfer',
  'c8-signal': 'event_recallIssued',
  'c8-error': 'event_cardDeclined',
  'c8-start-event': 'startEvent_paymentDue',
  'c7-boundary-host': 'event_refundTimedOut',
  'c7-event-definition': 'event_oneHourPassed',
  'c7-link-event': 'event_charge',
  'c7-multiple-event-definitions': 'event_paymentReceived',
  'c7-message': 'event_paymentReceived',
  'c7-signal': 'event_paymentCleared',
  'c7-error': 'endEvent_paymentFailed',
  'c7-escalation': 'endEvent_paymentEscalated',
  'c7-start-event': 'startEvent_reminderDue',
  'c7-transaction-start': 'subProcess_chargeCard',
  'c8-feel-expression': 'serviceTask_chargeCard',
  'c8-feel-completion-condition': 'serviceTask_chargeCard',
  'c8-implementation': 'sendTask_sendReceipt',
  'c8-bad-value': 'serviceTask_chargeCard',
  'c8-schema': 'serviceTask_chargeCard',
  'c8-listener': 'startEvent_orderReceived',
  'c8-extension': 'serviceTask_chargeCard',
  'c8-duplicate-extension': 'serviceTask_chargeCard',
  'c8-foreign-content': 'serviceTask_chargeCard',
  'c8-unknown-attribute': 'serviceTask_chargeCard',
  'c8-misplaced-attribute': 'startEvent_orderReceived',
  'c8-misplaced-extension': 'startEvent_orderReceived',
  'c7-extension': 'userTask_approveOrder',
  'c7-listener': 'serviceTask_chargeCard',
  'c7-input-output': 'startEvent_orderReceived',
  'c7-duplicate-extension': 'serviceTask_chargeCard',
  'c7-async-duplicate-extension': 'endEvent_orderPaid',
  'c7-foreign-content': 'serviceTask_chargeCard',
  'c7-unknown-attribute': 'userTask_approveOrder',
  'c7-misplaced-attribute': 'serviceTask_chargeCard',
  'c7-misplaced-extension': 'serviceTask_chargeCard',
  'c7-dangling-reference': 'serviceTask_chargeCard',
};

describe('example models', () => {
  for (const [rule, offender] of Object.entries(OFFENDER_BY_RULE)) {
    describe(rule, () => {
      it('the invalid model reports the offending element', async () => {
        expect(await reportedIds(rule, 'invalid')).toContain(offender);
      });

      it('the valid model is clean', async () => {
        expect(await reportedIds(rule, 'valid')).toEqual([]);
      });
    });
  }
});
