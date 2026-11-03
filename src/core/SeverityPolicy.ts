import type { RuleSet, RuleSeverity } from './bpmnlint-config';

/**
 * What a rule is, as far as the opinion layers care — the one fact each rule declares (`kind`)
 * from which its severity in every layer follows (see {@link SEVERITY_BY_KIND}):
 *  - `layout-hint` — a non-blocking layout hint, safe on hand-drawn diagrams;
 *  - `misdrawn` — a drawing defect, not merely untidy, so it blocks even while modeling;
 *  - `convention` — an execution-only convention a modeler shouldn't be blocked on;
 *  - `scheme` — needs a project-chosen scheme before it can say anything useful;
 *  - `engine-specific` — applies to one engine only (the rule also sets `targetEngine`).
 */
export type MiragonRuleKind =
  'layout-hint' | 'misdrawn' | 'convention' | 'scheme' | 'engine-specific';

/** The Miragon opinion layers, keyed by the config name they are exposed under. */
export type MiragonLayerName = 'recommended-for-modeling' | 'recommended-for-automation' | 'all';

/**
 * The severity policy: per rule kind, its severity in each layer. Only `all` blocks; the two
 * `recommended-for-*` layers stay non-blocking bar `misdrawn` in the modeling layer.
 */
const SEVERITY_BY_KIND: Record<MiragonRuleKind, Record<MiragonLayerName, RuleSeverity>> = {
  'layout-hint': {
    'recommended-for-modeling': 'warn',
    'recommended-for-automation': 'warn',
    all: 'error',
  },
  misdrawn: {
    'recommended-for-modeling': 'error',
    'recommended-for-automation': 'warn',
    all: 'error',
  },
  convention: {
    'recommended-for-modeling': 'off',
    'recommended-for-automation': 'warn',
    all: 'error',
  },
  scheme: { 'recommended-for-modeling': 'off', 'recommended-for-automation': 'off', all: 'error' },
  'engine-specific': {
    'recommended-for-modeling': 'off',
    'recommended-for-automation': 'off',
    all: 'error',
  },
};

/** Turns the `kind` every rule declares into its severity in each Miragon opinion layer. */
export class SeverityPolicy {
  private readonly pluginName: string;
  private readonly kindByRuleName: Record<string, { kind: MiragonRuleKind }>;

  constructor(pluginName: string, kindByRuleName: Record<string, { kind: MiragonRuleKind }>) {
    this.pluginName = pluginName;
    this.kindByRuleName = kindByRuleName;
  }

  /** Every rule at its severity in `layerName`, keyed `<pluginName>/<ruleName>`. */
  ruleSetFor(layerName: MiragonLayerName): RuleSet {
    return Object.fromEntries(
      Object.entries(this.kindByRuleName).map(([ruleName, { kind }]) => [
        `${this.pluginName}/${ruleName}`,
        SEVERITY_BY_KIND[kind][layerName],
      ]),
    );
  }
}
