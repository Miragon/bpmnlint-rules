/**
 * `@miragon/bpmnlint-plugin-rules/engine`: what a host needs to write its own engine rules and run
 * them, with camunda-compat's rules for an engine version (`compatRules` of `./camunda-7` /
 * `./camunda-8`), in one walk over the tree. An engine rule extends {@link EngineRule}, reports in
 * camunda-compat's shape (`path`, `data.type`) and is declared with {@link defineRule}.
 */
import { SinglePassLinter } from './resolver/SinglePassLinter';

export { EngineRule, EngineTarget } from './lib/engine';
export type { EngineRuleConfig } from './lib/engine';
export { defineRule } from './lib/utils/defineRule';
export type { DeclaredRuleFactory, RuleDeclaration } from './lib/utils/defineRule';
export type { Engine } from './lib/bpmnlint-config';
export type { ModdleElement, ReportDetails, ReportPath, Reporter, Rule } from './lib/moddle';
export type { LintReport, RuleEntry } from './resolver/SinglePassLinter';

/**
 * Lints `root` with `rules` as bpmnlint's `Linter` does, with the same reports in the same order,
 * but in one walk over the tree for all rules.
 */
export const lint = SinglePassLinter.lint;
