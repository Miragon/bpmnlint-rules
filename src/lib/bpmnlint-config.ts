/**
 * The small shape vocabulary shared across the rule-set folders, the resolver and the config
 * builder. Kept in `lib/` (a leaf, types only) so every folder can use it without importing
 * "upwards" into config/ or presets/.
 */

/** A bpmnlint severity as written in a config: 0/1/2 or the string form. */
export type RuleSeverity = 'off' | 'warn' | 'error' | 0 | 1 | 2;

/** A rule setting: a bare severity, or `[severity, options]` for a configurable rule. */
export type RuleSetting = RuleSeverity | [RuleSeverity, unknown];

/** A `{ ruleName: setting }` map — the `rules` block of a bpmnlint config. */
export type RuleSet = Record<string, RuleSetting>;

/** A bpmnlint (shareable) config: what a `.bpmnlintrc` or a `plugin:<pkg>/<config>` looks like. */
export interface BpmnlintConfig {
  extends?: string | string[];
  rules?: RuleSet;
  moddleExtensions?: Record<string, unknown>;
}

/**
 * A fragment of a bpmnlint `StaticResolver` cache: keys are `rule:<pkg>/<name>` or
 * `config:<pkg>/<name>`, values the resolved rule factory / config object. Each rule-set folder
 * contributes one of these; {@link createBundledResolver} merges them.
 */
export type ResolverEntries = Record<string, unknown>;
