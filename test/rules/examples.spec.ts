import { reportedIds } from '../support/lint-file';

/**
 * Every Miragon rule ships a matched pair of example models under `test/fixtures/rules/<rule>/`,
 * rendered to SVG for its doc page by `npm run docs:examples`. These tests keep the pair honest:
 * the invalid model must trip the rule on the element the doc points at, and the valid model must
 * stay silent — so the "good" picture in the docs is genuinely clean, not merely plausible.
 */
const EXAMPLES = [
  { rule: 'no-generated-ids', offender: 'Activity_0049ryx' },
  { rule: 'element-id-naming', offender: 'ReviewOrder' },
  { rule: 'flow-through-element', offender: 'flow_Reopen' },
  { rule: 'flow-connection-side', offender: 'flow_ToDecision' },
  { rule: 'flow-target-alignment', offender: 'flow_Archived' },
];

describe('example models', () => {
  for (const { rule, offender } of EXAMPLES) {
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
