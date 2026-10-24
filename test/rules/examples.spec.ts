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
