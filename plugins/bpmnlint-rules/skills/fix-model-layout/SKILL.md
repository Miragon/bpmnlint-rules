---
name: fix-model-layout
argument-hint: '[path/to/file.bpmn]'
description: Fixes BPMN layout problems such as crossing flows, overlaps or flows through shapes, changing only the diagram (BPMNDI). Use when asked to fix the layout or after verify-model-visually reports layout issues.
allowed-tools: Read, Bash, Edit, Glob, AskUserQuestion
---

# Skill: fix-model-layout

The **fixing** counterpart to `/verify-model-visually`. That skill (and `npx bpmnlint <file>`)
_locate_ layout problems; this skill _resolves_ them. Always start from their output — never guess
what is wrong.

There are two ways to fix, in escalating order. Prefer the earlier that applies.

## Key Rules

- **Only ever change the diagram** (`bpmndi:` — shape `dc:Bounds`, edge `di:waypoint`, label bounds).
  Never touch `bpmn:` semantics (flows, elements, types). Because layout bugs live entirely in the DI
  layer, a DI-only fix **cannot change what the process does**.
- **Use the bpmn CLI when it is available.** Check `bpmn --version`, else
  `npx -y @miragon/bpmn-cli --version`. If it runs, fix with its diagram-only format commands and
  don't edit the XML yourself (that is the bpmn CLI's own contract; `bpmn guide format` documents the
  commands). Only without the CLI edit the DI coordinates by hand.
- **Start from the findings.** Fix exactly what the validators flag.
- **Prefer a targeted fix**, then full re-layout. Escalate only when a targeted fix can't.
- **Full re-layout needs explicit user approval.** It is destructive — it discards all hand-tuned
  positioning — so never run it unprompted. Always confirm with `AskUserQuestion` first.
- **Re-validate after every fix** — `npx bpmnlint <file>` _and_ re-render — until clean. A fix that
  introduces a new finding is not a fix. Clear `warn` and `info` layout findings too; they mark real
  layout bugs even when they don't fail the build.

## Instructions

1. **Get the findings (the work list).** Often you already have them — if `npx bpmnlint` or
   `/verify-model-visually` ran just before in this session, or the user handed you their output,
   **use that list directly; don't re-run to regenerate it.** Only if you have no current findings,
   produce them now: run `npx bpmnlint <file>` (structural + geometric) and, for aesthetic issues,
   `/verify-model-visually <file>`. Either way, each finding names the element/flow and the rule —
   that is what you fix. (You _will_ re-run the validators at the end to verify — step 4.)

2. **Tier 1 — targeted fix.** Most layout problems are **deterministically detected**; Tier 1 is
   about the repair. The detector names the element for you:
   - **crossing flows / a flow routed through a shape** — detected by `@miragon/rules/flow-crossing`
     and `@miragon/rules/flow-through-element`; re-route the offending edge so it runs orthogonally
     around the obstacle (bpmn CLI: `route`, or `place` / `space` to make room).
   - **overlapping shapes** — detected by the standard `no-overlapping-elements` rule; the linter
     names the two shapes. Nudge one, with its edges and label (bpmn CLI: `tidy`).
   - **a missing shape** (invisible element) — detected by the standard `no-bpmndi` rule; add the
     shape on the path between its neighbours (bpmn CLI: the next write without `--no-layout` draws
     it; `route` draws a single missing flow).
   - **other `@miragon/rules/*` layout findings** (connection side, target alignment, orthogonal
     flows, boundary-event marker overlap, gateway marker) — each rule's message says what to move.
   - **only here is judgment the _detector_:** the subjective residue from `/verify-model-visually`
     (communicates intent, semantic grouping, cramped-but-valid, label quality) — no rule flags these;
     the rendered image is your input.

   With the bpmn CLI: `bpmn show <file> --layout` first, `--dry-run` each format command, then run it.
   Without it: `Read` the rendered image, then `Edit` the `.bpmn` DI coordinates — move whole groups
   consistently: the shape **and** its edge waypoints **and** its label move together. Re-render and
   re-lint after each fix.

3. **Tier 2 — full re-layout** (escape hatch — only if the model has no or garbage DI, or is beyond
   targeted repair). This **discards all hand-tuned positioning**, so it is **destructive and must not
   run without explicit user approval**. First use **`AskUserQuestion`** to ask whether to redraw the
   whole layout — making clear it throws away the hand-tuned positioning (happy-path prominence,
   semantic grouping, boundary-event placement). Only if the user approves:

   ```bash
   bpmn layout <file.bpmn>
   ```

   (or `npx -y @miragon/bpmn-cli layout <file.bpmn>`). Without the bpmn CLI there is no Tier 2: say so
   and stay at Tier 1. Then re-lint and touch up with Tier 1. If the user declines, stay at Tier 1.

4. **Verify.** Confirm all three:
   - **Re-render the image and look at it** — `/verify-model-visually <file>`, or render with
     `npx bpmn-to-image` and `Read` the PNG — and check the picture actually looks right (don't trust
     the lint exit code alone for a _layout_ fix).
   - **Re-lint** — `npx bpmnlint <file>` reports no `error` findings and the layout findings you set
     out to fix are gone (a fix that adds a new finding is not a fix).
   - **Process unchanged** — since you only changed DI, the executable process is untouched; run the
     project's process test if one exists (it re-confirms the model still parses and deploys).

5. **Report as a table** — one row per finding:

   | Finding                               | Element / flow | Fix applied                              | Tier |
   | ------------------------------------- | -------------- | ---------------------------------------- | ---- |
   | `@miragon/rules/flow-through-element` | `No` flow      | rerouted around `Send Confirmation Mail` | 1    |

## Choosing a tier

| Problem                                             | Detected by                                                            | Fix tier                                     |
| --------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| flow routed through a shape / crossing flows        | `@miragon/rules/flow-through-element` / `@miragon/rules/flow-crossing` | **1** (re-route the edge)                    |
| overlapping shapes                                  | **standard** `no-overlapping-elements`                                 | **1** (nudge one shape + its edges/label)    |
| missing shape (invisible element)                   | **standard** `no-bpmndi`                                               | **1** (place it; or **2** if no DI at all)   |
| "valid but reads badly" — intent, grouping, cramped | **judgment** (`/verify-model-visually`)                                | **1**                                        |
| model has no diagram interchange at all             | —                                                                      | **2** (destructive — needs approval, step 3) |

Only the judgment row needs a human/AI to _find_ the problem; everything else is flagged
deterministically (standard or Miragon rule).

If anything is unclear (which file, which fix to apply), ask before proceeding.
