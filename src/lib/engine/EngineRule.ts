import type { Engine } from '../bpmnlint-config';
import type { ModdleElement, Reporter, Rule } from '../moddle';
import { EngineTarget } from './EngineTarget';

/** The config every engine rule takes: the `<major>.<minor>` engine version to check against. */
export interface EngineRuleConfig {
  version?: string;
}

/**
 * Base of the rules for one engine. It skips every diagram that targets another engine and tells a
 * check which engine version it runs for: the rule's `version` config, else the diagram's
 * `modeler:executionPlatformVersion`, else the latest.
 */
export abstract class EngineRule implements Rule {
  protected abstract readonly engine: Engine;

  constructor(private readonly config: EngineRuleConfig = {}) {}

  check(node: ModdleElement, reporter: Reporter): boolean | void {
    if (!EngineTarget.forElement(node).targets(this.engine)) {
      return false;
    }
    return this.checkElement(node, reporter);
  }

  /** Whether the diagram of `node` runs on `minimum` or a newer engine version. */
  protected runsAtLeast(node: ModdleElement, minimum: string): boolean {
    const target = EngineTarget.forElement(node);
    return target.isAtLeast(minimum, this.config.version ?? target.version);
  }

  protected abstract checkElement(node: ModdleElement, reporter: Reporter): boolean | void;
}
