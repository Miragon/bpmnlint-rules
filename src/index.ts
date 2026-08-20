/**
 * `@miragon/bpmnlint-plugin-rules` — a bpmnlint plugin bundling the structural, Camunda 7/8 and
 * Miragon rule layers behind one resolver.
 *
 * Two ways in. Classic: the root {@link rules} + {@link configs} make `require(pkg)` a valid bpmnlint
 * plugin, so a `.bpmnlintrc` can `extends: ["plugin:@miragon/rules/recommended"]`. Programmatic:
 * {@link createBundledResolver} + {@link getDefaultLintConfig} hand a host one resolver over every
 * bundled rule and a layered config chosen per engine — no `bpmnlint` install, works offline. Every
 * rule, helper and rule-set is exported too, for consumers assembling a config by hand.
 */

// Resolver — the bundled StaticResolver over every layer.
export { createBundledResolver, bundledResolverEntries } from './resolver/createBundledResolver';
export type { Resolver } from './resolver/Resolver';

// Config building — the zero-config default, layered per engine.
export { getDefaultLintConfig, getRulesForEngine } from './config/engineConfig';
export type { Engine, DefaultLintConfigOptions } from './config/engineConfig';

// Ready-to-use presets (structural base + Miragon layer).
export { recommended } from './presets/recommended';
export { all } from './presets/all';

// The classic bpmnlint-plugin surface — `rules` (path strings) + `configs` — so `require(pkg)` is a
// valid bpmnlint plugin for `.bpmnlintrc`/CLI use. Programmatic consumers use the resolver + configs
// below instead.
export { rules, configs } from './plugin';

// Miragon rule-sets and the individual rule factories.
export {
  MIRAGON_PLUGIN,
  miragonRecommended,
  miragonAll,
  miragonRuleFactories,
  visualRules,
  namingRules,
  elementIdNaming,
  flowThroughElement,
  noGeneratedIds,
} from './rules/miragon';

// Engine and structural rule-sets (the camunda-compat / bpmnlint shareable configs).
export { commonRules } from './rules/common';
export { camunda7Rules } from './rules/camunda-7';
export { camunda8Rules } from './rules/camunda-8';

// Shared types + rule-authoring helpers, for consumers writing their own rules.
export type {
  BpmnlintConfig,
  ResolverEntries,
  RuleSet,
  RuleSetting,
  RuleSeverity,
} from './lib/bpmnlint-config';
export type { ModdleElement, Reporter, Rule, RuleFactory } from './lib/moddle';
export * as naming from './lib/naming';
export * as di from './lib/di';
export * as geometry from './lib/geometry';
