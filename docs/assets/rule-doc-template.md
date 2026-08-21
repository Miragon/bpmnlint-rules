<!--
==============================================================================
RULE DOC TEMPLATE. Copy this into docs/rules/<name>.md, then fill the
placeholders and delete this comment block.

Every rule page uses this same skeleton and follows the same wording rules, so
the docs read as one voice instead of one-off pages.

------------------------------------------------------------------------------
STRUCTURE (keep this order, keep the headings)
------------------------------------------------------------------------------
  1. H1 title:            `@miragon/rules/<name>`
  2. Severity blockquote: pick variant A or B below, verbatim.
  3. One-line summary:    a single plain sentence, right under the blockquote.
  4. ## Why
  5. ## Why this matters for agentic BPMN
  6. ## Scope             (rename to "What counts as …", "Default convention",
                           "What it does not report" where that fits better)
  7. ## Configuration     (only if the rule takes options; drop it otherwise)
  8. ## Examples
  9. ## Further reading
 10. ## Related           (optional)

Drop a section only when it genuinely does not apply (e.g. Configuration for a
rule with no options). Do not add sections the template does not list.

------------------------------------------------------------------------------
WORDING RULES (these keep the pages from reading as machine-written)
------------------------------------------------------------------------------
  - No dash as punctuation. Never use an em dash (—), an en dash (–), or a
    spaced hyphen ( - ) to break a sentence. Rewrite with a comma, a colon,
    parentheses, or two sentences. This holds in prose, in list-item
    descriptions, in image captions, and in link labels.
      write:  "Reports IDs that were generated rather than chosen."
      not:    "Reports IDs that were generated — not chosen."
    Compound-word hyphens are correct English and stay: "left-to-right",
    "loop-back", "task-sized", "non-blocking", "AI-authored".
  - No "not just X, but Y" / "it isn't just … it's …" constructions, and no
    other set-up-then-reveal phrasing. State the point once, plainly.
  - Plain, declarative sentences. The rule is the subject: "Reports …",
    "The rule guarantees …". Present tense, active voice.
  - Do not invent new bold inline labels. The only two are the fixed
    "**Typical AI artifact without this rule:**" and
    "**What this rule guarantees:**" in the agentic section.
  - Keep captions in one shape: "👎 Invalid: <what is wrong>" and
    "👍 Valid: <what is right>".
  - Link labels carry no dash either. Write "Camunda: Naming technically
    relevant IDs", then a colon and the reason it is worth reading.
==============================================================================
-->

# `@miragon/rules/<name>`

<!-- Severity blockquote, VARIANT A: id / naming rules (off while modeling). -->

> This rule is **off** in `plugin:@miragon/rules/recommended-for-modeling` (id conventions matter once a process is executable, not while modeling). It is a non-blocking `warn` in `plugin:@miragon/rules/recommended-for-automation` and an `error` in `plugin:@miragon/rules/all`. Set it to `warn`, `error` or `off` yourself to override.

<!-- Severity blockquote, VARIANT B: layout / geometry hints (warn in both). -->

> This rule is a non-blocking `warn` in both `plugin:@miragon/rules/recommended-for-modeling` and `plugin:@miragon/rules/recommended-for-automation`. In `plugin:@miragon/rules/all` it is an `error`. Override it to `warn`, `error` or `off` yourself.

<One plain sentence: what the rule reports.>

## Why

<One or two short paragraphs. Do not stop at "it is cleaner" or "more readable".
Ground the value in concrete stakes: name where the thing surfaces in real work
(a process test asserting on an id, a monitoring view like Operate or Cockpit, a
code diff, a generated constant, the rendered diagram a stakeholder signs off on)
and who is blocked when it is wrong (a developer, a tester, an on-call operator,
a business stakeholder). Say what those people cannot do, not just that the model
looks worse. Keep it to what is true for THIS rule: an id rule surfaces in tests
and monitoring; a layout rule surfaces in the diagram people read to follow the
process.>

## Why this matters for agentic BPMN

<How the defect shows up in AI-authored or auto-laid-out models, and why the XML
review misses it.>

**Typical AI artifact without this rule:** <one concrete example of the defect.>

**What this rule guarantees:** <the invariant the rule holds, in one sentence.>

## Scope

<Precisely what the rule looks at and what it deliberately leaves alone. Every
exclusion the rule makes belongs here. For a rule that classifies inputs, rename
this to "What counts as …"; for a naming rule, "Default convention" fits better.>

## Configuration

<!-- Keep this section only if the rule takes options; otherwise delete it. -->

```json
{
  "rules": {
    "@miragon/rules/<name>": ["error", {}]
  }
}
```

| Option     | Default     | Effect                       |
| ---------- | ----------- | ---------------------------- |
| `<option>` | `<default>` | <what it changes, one line.> |

## Examples

<One sentence framing the model the two pictures share, if it helps the reader.>

👎 Invalid: <what is wrong in this model>

![<alt text describing the invalid model>](./assets/<name>-invalid.svg)

👍 Valid: <what is right in this model>

![<alt text describing the valid model>](./assets/<name>-valid.svg)

<!-- Optional: the same difference as XML, when the geometry or attribute is the
     point. Keep the two 👎 / 👍 blocks. -->

The same, as XML. 👎 wrong:

```xml
<!-- the offending markup -->
```

👍 right:

```xml
<!-- the corrected markup -->
```

## Further reading

- [Camunda: <page title>](url): <why it is worth reading, one line.>

## Related

<!-- Optional; drop the whole section if there is nothing to link. -->

- [`@miragon/rules/<other>`](./<other>.md): <how the two rules relate.>
