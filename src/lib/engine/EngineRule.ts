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
 * `modeler:executionPlatformVersion`, else the latest. The target is read when a run enters
 * `bpmn:Definitions` and holds for that run; a run that starts below it reads it per element.
 */
export abstract class EngineRule implements Rule {
  protected abstract readonly engine: Engine;

  private runTarget: EngineTarget | undefined;

  constructor(private readonly config: EngineRuleConfig = {}) {}

  check(node: ModdleElement, reporter: Reporter): boolean | void {
    if (node.$type === 'bpmn:Definitions') {
      this.runTarget = EngineTarget.forElement(node);
    }
    if (!this.targetOf(node).targets(this.engine)) {
      return false;
    }
    return this.checkElement(node, reporter);
  }

  /** Whether the diagram of `node` runs on `minimum` or a newer engine version. */
  protected runsAtLeast(node: ModdleElement, minimum: string): boolean {
    const target = this.targetOf(node);
    return target.isAtLeast(minimum, this.config.version ?? target.version);
  }

  private targetOf(node: ModdleElement): EngineTarget {
    return this.runTarget ?? EngineTarget.forElement(node);
  }

  protected abstract checkElement(node: ModdleElement, reporter: Reporter): boolean | void;
}
