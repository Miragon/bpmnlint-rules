/**
 * Shared types for the seam where our rules meet the untyped moddle tree.
 *
 * A moddle element is a dynamically-shaped object bpmn-moddle builds from the XML; there is no
 * generated type for it, so `ModdleElement` is intentionally loose — exactly the `@typedef {any}`
 * the bpmn-io ecosystem itself uses. The rule/reporter contract, by contrast, is small and worth
 * pinning down precisely.
 */

/** A node in the bpmn-moddle tree — untyped by nature (see the module comment). */
export type ModdleElement = any;

/** What a rule calls to record a violation on an element. */
export interface Reporter {
  report(id: string, message: string): void;
}

/** The visitor a bpmnlint rule returns: `check` runs on every element. */
export interface Rule {
  check: (node: ModdleElement, reporter: Reporter) => void;
}

/**
 * A bpmnlint rule module: a factory that returns a {@link Rule}, optionally configured.
 *
 * The config is `any` so a concrete rule with its own typed config (e.g. `ElementIdNamingConfig`)
 * is still assignable here — bpmnlint hands rules an untyped config value at runtime regardless.
 */
export type RuleFactory = (config?: any) => Rule;
