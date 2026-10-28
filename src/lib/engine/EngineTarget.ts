import { is } from 'bpmnlint-utils';

import type { Engine } from '../bpmnlint-config';
import type { ModdleElement } from '../moddle';

const ENGINE_NAMESPACES: Record<Engine, string> = {
  c7: 'http://camunda.org/schema/1.0/bpmn',
  c8: 'http://camunda.org/schema/zeebe/1.0',
};

/** How Camunda Modeler, CIB seven and Operaton spell the platform, matched by prefix. */
const EXECUTION_PLATFORM_PREFIXES: Record<Engine, string[]> = {
  c7: ['camunda platform', 'camunda 7', 'cib seven', 'cibseven', 'operaton'],
  c8: ['camunda cloud', 'camunda 8', 'zeebe'],
};

/**
 * The engine a diagram targets and its `<major>.<minor>` version, read from `bpmn:Definitions`:
 * `modeler:executionPlatform` and `modeler:executionPlatformVersion` when set, else the one vendor
 * namespace the file declares. A file that declares both namespaces, or neither, targets no engine.
 */
export class EngineTarget {
  private static readonly byDefinitions = new WeakMap<object, EngineTarget>();

  private constructor(
    readonly engine: Engine | undefined,
    readonly version: string | undefined,
  ) {}

  /** The target of the diagram `node` belongs to. */
  static forElement(node: ModdleElement): EngineTarget {
    const definitions = EngineTarget.definitionsOf(node);
    if (!definitions) {
      return new EngineTarget(undefined, undefined);
    }

    let target = EngineTarget.byDefinitions.get(definitions);
    if (!target) {
      target = EngineTarget.read(definitions);
      EngineTarget.byDefinitions.set(definitions, target);
    }
    return target;
  }

  targets(engine: Engine): boolean {
    return this.engine === engine;
  }

  /** Whether the target runs `minimum` or newer; a diagram without a version runs the latest. */
  isAtLeast(minimum: string, version = this.version): boolean {
    if (!version) {
      return true;
    }
    const [major = 0, minor = 0] = version.split('.').map(Number);
    const [minimumMajor = 0, minimumMinor = 0] = minimum.split('.').map(Number);
    return major !== minimumMajor ? major > minimumMajor : minor >= minimumMinor;
  }

  private static read(definitions: ModdleElement): EngineTarget {
    const executionPlatform = definitions.get('modeler:executionPlatform');
    const declared =
      typeof executionPlatform === 'string'
        ? EngineTarget.engineOfPlatform(executionPlatform)
        : undefined;
    const engine = declared ?? EngineTarget.engineOfNamespaces(definitions);
    const version = declared
      ? EngineTarget.minorVersion(definitions.get('modeler:executionPlatformVersion'))
      : undefined;
    return new EngineTarget(engine, version);
  }

  private static engineOfPlatform(executionPlatform: string): Engine | undefined {
    const normalized = executionPlatform.trim().toLowerCase();
    return (Object.keys(EXECUTION_PLATFORM_PREFIXES) as Engine[]).find((engine) =>
      EXECUTION_PLATFORM_PREFIXES[engine].some((prefix) => normalized.startsWith(prefix)),
    );
  }

  private static engineOfNamespaces(definitions: ModdleElement): Engine | undefined {
    const uris = new Set(
      Object.entries(definitions.$attrs ?? {})
        .filter(([name]) => name.startsWith('xmlns:'))
        .map(([, uri]) => uri),
    );
    const declared = (Object.keys(ENGINE_NAMESPACES) as Engine[]).filter((engine) =>
      uris.has(ENGINE_NAMESPACES[engine]),
    );
    return declared.length === 1 ? declared[0] : undefined;
  }

  private static minorVersion(version: unknown): string | undefined {
    const match = typeof version === 'string' ? /^\s*(\d+)\.(\d+)/.exec(version) : null;
    return match ? `${match[1]}.${match[2]}` : undefined;
  }

  private static definitionsOf(node: ModdleElement): ModdleElement | undefined {
    let current = node;
    while (current && !is(current, 'bpmn:Definitions')) {
      current = current.$parent;
    }
    return current;
  }
}
