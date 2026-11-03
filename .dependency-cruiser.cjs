/**
 * Architecture guardrail for the package's module graph.
 *
 * Layering (imports only ever point "down"):
 *   index / plugin        -> presets, config, resolver, rules, core, toolkit (public surface)
 *   presets / config      -> the rule-set folders' data + core       (compose layers)
 *   resolver              -> the rule-set folders' resolverEntries
 *   rules/miragon/<rule>  -> toolkit/, core/, its own folder         (a rule is a check over helpers)
 *   rules/{common,camunda-7,camunda-8} -> core/, upstream packages   (static-import glue)
 *   toolkit/              -> core/, other toolkit folders            (BPMN knowledge rules reuse)
 *   toolkit/geometry/     -> (leaf)                                  (pure math, no BPMN)
 *   core/                 -> (leaf)                                  (the bpmnlint contract)
 *
 * The boundaries that matter:
 *  - A rule may never import another rule — bpmnlint resolves each independently; move
 *    rule-agnostic logic to toolkit/. A rule folder's index.ts (rules/miragon/<rule>/index.ts) is
 *    its only entry; the rest of the folder is private to it.
 *  - core/ and toolkit/ never reach up into rules/config/presets/resolver.
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
      name: 'core-is-a-leaf',
      comment: 'core/ is the bpmnlint contract every other folder builds on; it imports nothing.',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: '^src/', pathNot: '^src/core/' },
    },
    {
      name: 'toolkit-not-upwards',
      comment: 'toolkit/ holds BPMN knowledge rules reuse; it may only build on core/ and itself.',
      severity: 'error',
      from: { path: '^src/toolkit/' },
      to: { path: '^src/', pathNot: '^src/(core|toolkit)/' },
    },
    {
      name: 'geometry-is-pure',
      comment: 'toolkit/geometry/ is pure math and must not depend on BPMN knowledge.',
      severity: 'error',
      from: { path: '^src/toolkit/geometry/' },
      to: { path: '^src/', pathNot: '^src/toolkit/geometry/' },
    },
    {
      name: 'no-rule-to-rule',
      comment:
        'Rules are resolved independently by bpmnlint. Share code through toolkit/, never another rule.',
      severity: 'error',
      from: {
        path: '^src/rules/miragon/([^/.]+)(\\.ts$|/)',
        pathNot: '^src/rules/miragon/index\\.ts$',
      },
      to: {
        path: '^src/rules/miragon/',
        pathNot: ['^src/rules/miragon/index\\.ts$', '^src/rules/miragon/$1(\\.ts$|/)'],
      },
    },
    {
      name: 'rule-folder-private',
      comment:
        "Only a rule's own folder may import its helpers; everyone else goes through index.ts.",
      severity: 'error',
      from: { pathNot: '^src/rules/miragon/[^/]+/' },
      to: { path: '^src/rules/miragon/[^/]+/', pathNot: '^src/rules/miragon/[^/]+/index\\.ts$' },
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
      comment: 'A core/ or toolkit/ module nobody imports is dead code — delete it or wire it up.',
      severity: 'error',
      from: { orphan: true, path: '^src/(core|toolkit)/.+\\.ts$' },
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
