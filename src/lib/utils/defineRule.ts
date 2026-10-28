import type { Engine, EngineImpact } from '../bpmnlint-config';
import type { Rule } from '../moddle';
import type { MiragonRuleKind } from '../SeverityPolicy';

/** What a Miragon rule declares about itself next to its implementation. */
export interface RuleDeclaration<Name extends string = string> {
  ruleName: Name;
  kind: MiragonRuleKind;
  targetEngine?: Engine;
  /** An engine rule's place in its engine layer (`plugin:@miragon/rules/camunda-<n>`). */
  impact?: EngineImpact;
}

/** A bpmnlint rule factory carrying its {@link RuleDeclaration}. */
export type DeclaredRuleFactory<Name extends string = string, Config = any> = ((
  config?: Config,
) => Rule) &
  RuleDeclaration<Name>;

/**
 * The bpmnlint rule module for a rule class: a plain factory (bpmnlint calls it without `new`)
 * carrying the rule's declaration as properties. It is a rule file's only export, so tsup's
 * `cjsInterop` emits it as the bare `module.exports = factory` bpmnlint's classic resolver needs.
 * bpmnlint calls `check` detached from its rule, so the returned rule binds it to the instance.
 */
export function defineRule<const Name extends string, Config>(
  declaration: RuleDeclaration<Name>,
  RuleClass: new (config?: Config) => Rule,
): DeclaredRuleFactory<Name, Config> {
  const factory = (config?: Config): Rule => {
    const rule = new RuleClass(config);
    return { check: (node, reporter) => rule.check(node, reporter) };
  };

  return Object.assign(factory, declaration);
}
