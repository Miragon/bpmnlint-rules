import type { ModdleElement } from '../../core/moddle';

export type ExternalTaskNamespace = 'camunda' | 'operaton';

const EXTERNAL_TASK_NAMESPACES: ExternalTaskNamespace[] = ['camunda', 'operaton'];

export class ExternalTask {
  static namespaceOf(implementation: ModdleElement): ExternalTaskNamespace | undefined {
    return EXTERNAL_TASK_NAMESPACES.find(
      (namespace) => implementation.get(`${namespace}:type`) === 'external',
    );
  }
}
