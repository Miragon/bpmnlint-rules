import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { Finding } from '../support/lint-file';
import { fullConfigReports } from '../support/lint-file';

/**
 * Beyond the single rule each fixture illustrates (guarded by `examples.spec.ts`), every example
 * model must be *sound* against the plugin's strictest engine-agnostic bar —
 * `bpmnlint:recommended` + `plugin:@miragon/rules/all`, the exact config a strict consumer gets and
 * the one `test/fixtures/valid/membership.bpmn` already meets. Otherwise a model shown in the docs
 * as exemplary can still be missing labels, start/end events or a connection and nobody notices.
 *
 * The one carve-out is per element, not per rule: an `invalid` model is *meant* to carry one
 * intentional defect, so any rule may fire — but only on the element(s) that carry that defect. No
 * rule may fire on any other element, and on the valid side nothing may fire at all. A per-element
 * check (rather than "only the demonstrated rule key may appear") is deliberate: a single defect can
 * legitimately trip more than one rule — a generated id like `Activity_0049ryx` violates both
 * `no-generated-ids` and `element-id-naming` at once — and that is still just one defect.
 */

/**
 * Derived from the fixture folders on disk, not a hand-maintained list: a new rule enrols itself in
 * this gate the moment its `test/fixtures/rules/<name>/` pair exists, so it can never be added and
 * silently left unchecked. Folder name == rule name, so `@miragon/rules/<folder>` is the rule the
 * folder's model is expected to demonstrate.
 */
const RULES = readdirSync(fileURLToPath(new URL('../fixtures/rules', import.meta.url)), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

/** How bpmnlint keys a Miragon rule's findings in the lint result. */
const miragonKey = (rule: string) => `@miragon/rules/${rule}`;

/** Renders a findings map as `rule: id (message)` lines, so a failure names exactly what to fix. */
function describeFindings(reports: Record<string, Finding[]>): string {
  return Object.entries(reports)
    .flatMap(([rule, findings]) =>
      findings.map((finding) => `  ${rule}: ${finding.id} (${finding.message})`),
    )
    .join('\n');
}

/** Every element id flagged by any rule. */
function allReportedIds(reports: Record<string, Finding[]>): Set<string> {
  return new Set(
    Object.values(reports).flatMap((findings) => findings.map((finding) => finding.id)),
  );
}

describe('example models are sound against the full ruleset', () => {
  for (const rule of RULES) {
    describe(rule, () => {
      it('the valid model is clean against every rule', async () => {
        const reports = await fullConfigReports(rule, 'valid');
        expect(Object.keys(reports), `valid.bpmn tripped:\n${describeFindings(reports)}`).toEqual(
          [],
        );
      });

      it('the invalid model carries its intentional defect and nothing else', async () => {
        const reports = await fullConfigReports(rule, 'invalid');
        const demonstrated = new Set(
          (reports[miragonKey(rule)] ?? []).map((finding) => finding.id),
        );

        // The demonstrated rule must actually fire (examples.spec.ts pins which element).
        expect(
          demonstrated.size,
          `invalid.bpmn does not trip its own rule <${miragonKey(rule)}>:\n${describeFindings(reports)}`,
        ).toBeGreaterThan(0);

        // Nothing may be flagged outside the element(s) carrying that defect.
        const stray = [...allReportedIds(reports)].filter((id) => !demonstrated.has(id));
        expect(
          stray,
          `invalid.bpmn flags elements unrelated to its defect:\n${describeFindings(reports)}`,
        ).toEqual([]);
      });
    });
  }
});
