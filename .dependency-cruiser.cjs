/**
 * Architecture guardrail for the package's module graph.
 *
 * Layering (imports only ever point "down"):
 *   index / plugin        -> presets, config, resolver, rules   (public surface + registry)
 *   presets / config      -> the rule-set folders' data + lib    (compose layers)
 *   resolver              -> the rule-set folders' resolverEntries
 *   rules/miragon/<rule>  -> lib/                                 (a rule is a check over helpers)
 *   rules/{common,camunda-7,camunda-8} -> upstream packages only (static-import glue)
 *   lib/                  -> (leaf)                               (pure moddle/DI/geometry helpers)
 *
 * The boundaries that matter:
 *  - A rule may never import another rule — bpmnlint resolves each independently; share via lib/.
 *  - lib/ stays a leaf so the helpers are testable in isolation.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Circular dependencies make the module graph hard to reason about.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'lib-is-a-leaf',
      comment: 'lib/ holds pure helpers; it must not reach back up into the rest of the package.',
      severity: 'error',
      from: { path: '^src/lib/' },
      to: { path: '^src/(rules|config|presets|resolver|plugin|index)' },
    },
    {
      name: 'no-rule-to-rule',
      comment:
        'Rules are resolved independently by bpmnlint. Share code through lib/, never another rule.',
      severity: 'error',
      from: { path: '^src/rules/miragon/(?!index\\.ts$).+' },
      to: { path: '^src/rules/miragon/(?!index\\.ts$).+' },
    },
    {
      name: 'rules-not-upwards',
      comment: 'A rule must not read config/presets/resolver — those are layers built ON rules.',
      severity: 'error',
      from: { path: '^src/rules/' },
      to: { path: '^src/(config|presets|resolver)/' },
    },
    {
      name: 'no-dead-helpers',
      comment: 'A lib/ helper nobody imports is dead code — delete it or wire it up.',
      severity: 'error',
      from: { orphan: true, path: '^src/lib/.+\\.ts$' },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    includeOnly: '^src/',
    exclude: { path: '^(test|node_modules)/' },
  },
};
