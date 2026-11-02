import { is } from 'bpmnlint-utils';

import type { Engine } from './bpmnlint-config';
import type { ModdleElement } from './moddle';

const EXECUTION_PLATFORMS: Record<string, Engine> = {
  'Camunda Platform': 'c7',
  'Camunda Cloud': 'c8',
};

const ENGINE_NAMESPACES: Record<string, Engine> = {
  'http://camunda.org/schema/1.0/bpmn': 'c7',
  'http://camunda.org/schema/zeebe/1.0': 'c8',
};

/**
 * The engine a diagram is modelled for: its `modeler:executionPlatform`, or without one, the
 * engine namespace it declares (`camunda:` for Camunda 7, `zeebe:` for Camunda 8).
 */
export class ExecutionEngine {
  static is(node: ModdleElement, engine: Engine): boolean {
    return this.detect(node) === engine;
  }

  static detect(node: ModdleElement): Engine | undefined {
    const definitions = this.definitionsOf(node);
    if (!definitions) {
      return undefined;
    }
    const executionPlatform = definitions.get('modeler:executionPlatform');
    if (executionPlatform !== undefined) {
      return EXECUTION_PLATFORMS[executionPlatform];
    }
    return this.declaredEngineOf(definitions);
  }

  private static definitionsOf(node: ModdleElement): ModdleElement | undefined {
    let current = node;
    while (current && !is(current, 'bpmn:Definitions')) {
      current = current.$parent;
    }
    return current;
  }

  private static declaredEngineOf(definitions: ModdleElement): Engine | undefined {
    const namespaces = Object.entries(definitions.$attrs ?? {})
      .filter(([name]) => name.startsWith('xmlns:'))
      .map(([, uri]) => uri as string);
    return namespaces.map((uri) => ENGINE_NAMESPACES[uri]).find(Boolean);
  }
}
