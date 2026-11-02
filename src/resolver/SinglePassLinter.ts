import type { ModdleElement } from '../lib/moddle';
import { type LintReport, type RuleEntry, RuleRun } from './RuleRun';

export type { LintReport, RuleEntry } from './RuleRun';

const SIMPLE_TYPES = new Set(['String', 'Boolean', 'Integer', 'Real']);

interface ContainedProperty {
  name: string;
  isMany: boolean;
}

/**
 * Lints like bpmnlint's `Linter`, with the same reports in the same order, but walks the tree once
 * for all rules instead of once per rule. A rule whose check returns `false` skips the element's
 * children for that rule only; a rule that throws reports one `rule-error` and nothing else.
 */
export class SinglePassLinter {
  private static readonly containedProperties = new WeakMap<object, ContainedProperty[]>();

  static lint(this: void, root: ModdleElement, rules: RuleEntry[]): Record<string, LintReport[]> {
    const runs = rules.map((entry) => new RuleRun(entry));
    SinglePassLinter.visit(root, runs);
    const results: Record<string, LintReport[]> = {};
    for (const run of runs) {
      const reports = run.reports();
      if (reports.length) {
        results[run.name] = reports;
      }
    }
    return results;
  }

  private static visit(node: ModdleElement, runs: RuleRun[]): void {
    const descending = runs.filter(
      (run) => run.error === undefined && (!run.enter || run.call(run.enter, node) !== false),
    );
    if (descending.length && !node.$descriptor.isGeneric) {
      for (const property of SinglePassLinter.containedPropertiesOf(node.$descriptor)) {
        if (!(property.name in node)) {
          continue;
        }
        const value = node[property.name];
        if (property.isMany) {
          for (const child of value) {
            SinglePassLinter.visit(child, descending);
          }
        } else {
          SinglePassLinter.visit(value, descending);
        }
      }
    }
    for (const run of runs) {
      if (run.leave && run.error === undefined) {
        run.call(run.leave, node);
      }
    }
  }

  private static containedPropertiesOf(descriptor: { properties: Record<string, unknown>[] }) {
    let properties = SinglePassLinter.containedProperties.get(descriptor);
    if (!properties) {
      properties = descriptor.properties
        .filter(
          (property) =>
            !property.isAttr && !property.isReference && !SIMPLE_TYPES.has(property.type as string),
        )
        .map((property) => ({ name: property.name as string, isMany: !!property.isMany }));
      SinglePassLinter.containedProperties.set(descriptor, properties);
    }
    return properties;
  }
}
