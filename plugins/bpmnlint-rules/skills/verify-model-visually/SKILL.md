---
name: verify-model-visually
argument-hint: '[path/to/file.bpmn]'
description: Use while modeling a BPMN process to review a model you just edited. Runs both quality nets — the deterministic bpmnlint geometry rules and a visual review of the rendered image — and reports a combined verdict. Catches invisible elements, overlaps, crossing flows, flows routed through a shape (lint), plus messy or hard-to-read layout that needs judgment (image). Use after editing a model, or when asked to review the diagram, check the layout, or verify the model looks right.
allowed-tools: Read, Bash, Glob
---

# Skill: verify-model-visually

Give the agent the feedback loop it lacks. BPMN bugs at the _visual_ layer (BPMNDI) are invisible in
the XML — a task can execute but never render; a shape can sit at guessed coordinates that overlap a
neighbour or make a flow cross a label — and none of it shows up in a code diff. A model is guarded by
**two complementary nets, and this skill runs both**:

- **bpmnlint** (`npx bpmnlint <file>`) — the **deterministic** net: invisible elements (`no-bpmndi`),
  overlaps (`no-overlapping-elements`), crossing flows (`@miragon/rules/flow-crossing`), flows routed
  through a shape (`@miragon/rules/flow-through-element`) and the other `@miragon/rules/*` layout rules.
  Fast, exact, no judgment.
- **the rendered image** — the **judgment** net: intent, semantic grouping, cramped-but-valid spacing,
  label quality — what no formula can settle.

Run lint first, then look at the picture. A geometric defect the image catches that lint missed is
itself a finding — call it out.

## Key Rules

- **Run both nets and report both.** Lint for geometry, image for judgment. A green lint with an ugly
  picture still fails the review; a clean picture with a red lint still fails.
- **Review the rendered image, not the XML.** Never reason about layout from `<dc:Bounds>` or
  waypoints. Open the PNG and judge what a human sees.
- **Check the model against the team's layout conventions.** If `BPMN_STYLE_GUIDE.md` exists (current
  directory, then the git root), load its layout rules each run (`category: business-modeling` rules
  under a _Layout_ heading); do not rely on memory. Without a guide, use the checklist in step 5.
- **Report concrete, _located_ issues.** Name the element or flow and the rule it breaks ("the
  `Send Welcome Mail` task overlaps the sub-process border" / "the `No` flow crosses the
  `Send Confirmation Mail` task"). Never give a vague verdict like "looks a bit off".
- **If everything passes, say so explicitly** and list what each net checked.
- **Read-only.** Never modify the `.bpmn` file; fixing is `/fix-model-layout`.

## Instructions

1. **Resolve the `.bpmn` file.** Use the path the user gave. If none, `Glob` for `**/*.bpmn` (exclude
   `build/`, `target/`, `node_modules/`). If more than one matches and the target is ambiguous, ask
   which file to review before continuing.

2. **Run the deterministic linter first (geometry net).**

   ```bash
   npx bpmnlint <path-to-bpmn>
   ```

   It uses the project's `.bpmnlintrc`. Clean = no output, exit 0. Every finding names the
   element/flow and the rule; `error` findings exit non-zero, `warn` and `info` findings print and
   still exit 0 — both count for this review. **Capture each finding** for the report, but don't stop;
   still do the visual pass.

   No `.bpmnlintrc`, or bpmnlint / `@miragon/bpmnlint-plugin-rules` not installed: say so in the
   report, suggest `npm i -D bpmnlint @miragon/bpmnlint-plugin-rules` with a `.bpmnlintrc` that
   extends `bpmnlint:recommended` and `plugin:@miragon/rules/recommended-for-modeling` (or
   `/build-bpmn-styleguide`), and continue with the visual pass alone. **Skip this step only when
   geometry was already linted in this run** (CI's lint job, a pre-commit hook); note that lint ran
   upstream. An example CI workflow that runs the lint job and then this skill:
   <https://miragon.github.io/bpmnlint-rules/integrate/ci>.

3. **Render the model to PNG** with [bpmn-to-image](https://github.com/bpmn-io/bpmn-to-image). Write
   to a scratch directory outside the project:

   ```bash
   mkdir -p /tmp/bpmn-verify
   npx bpmn-to-image <path-to-bpmn>:/tmp/bpmn-verify/<name>.png
   ```

   If the render command fails, stop and report the error (a model that will not render is itself a
   finding).

4. **Load the inputs.** `Read` the rendered PNG (it loads as an image) and, if present, the layout
   rules of `BPMN_STYLE_GUIDE.md`.

   If labels are too small to read — the Read tool downsamples large images, so this happens on wider
   diagrams — re-render at a higher scale and read that instead:

   ```bash
   npx bpmn-to-image --scale 2 <path-to-bpmn>:/tmp/bpmn-verify/<name>.png
   ```

   If it's still not legible, bump `--scale` further and/or crop into left-to-right sections (macOS
   `sips`, or ImageMagick `magick <in> -crop <w>x<h>+<x>+<y> <out>` elsewhere):

   ```bash
   sips -g pixelWidth /tmp/bpmn-verify/<name>.png
   sips -c <height> <cropW> --cropOffset <topY> <leftX> /tmp/bpmn-verify/<name>.png --out /tmp/bpmn-verify/<name>-1.png
   ```

5. **Review the image for the judgment residue.** Lint already owns the geometric checks, so here you
   focus on what it can't decide — but use the picture to _confirm_ the geometry too (a geometric
   defect visible here that lint did **not** flag is a finding). Work through, in order:
   - **Visibility** — is every element the process uses actually drawn? Watch for a flow that ends in
     empty space, a node with no incoming/outgoing arrow, or an obvious gap where a task should be —
     these signal an element that executes but has no shape. _Not_ a defect: compensation handlers (a
     task on a dotted association to a boundary compensation event) and event sub-process starts sit
     off the main sequence-flow chain by design — never flag them as orphaned.
   - **No overlaps** — no two shapes (or a shape and a label) sit on top of each other.
   - **No crossing flows** — sequence flows do not cross each other, and no flow runs through a shape
     or over a label.
   - **Spacing & alignment** — consistent gaps; elements on a shared lane line up; the flow reads
     left-to-right. _(judgment — lint can't settle this)_
   - **Readable labels** — every label is legible, near its element, and not clipped. _(judgment)_
   - **The style guide's layout rules**, if there is a guide.

6. **Report a combined verdict — both nets.** Lead with the overall result, then one section per net:
   - **Geometry (bpmnlint):** ✅ clean, or a table of the lint findings (rule + element/flow).
   - **Judgment (rendered image):** a table — one row per issue, each concretely **located**:

     | Element / flow           | What is wrong                                  | Rule              | Severity |
     | ------------------------ | ---------------------------------------------- | ----------------- | -------- |
     | `Send Welcome Mail` task | overlaps the sub-process border                | No overlaps       | high     |
     | `No` flow                | runs through the `Send Confirmation Mail` task | No crossing flows | high     |

   If both nets are clean, say so explicitly (a single `✅ no issues` row per net is fine) and name
   what each one checked.

7. **Fixing is a separate skill.** When there are findings, hand them to **`/fix-model-layout`** — it
   resolves them in the diagram only, so the executable process stays unchanged. After any fix,
   **re-run both nets** (from step 2) until both are clean — a fix that adds a new finding is not a
   fix.

8. **Clean up.** Delete the rendered PNGs from `/tmp/bpmn-verify/` once you are done inspecting them.

If anything is unclear (which file, what "done" looks like), ask before proceeding.
