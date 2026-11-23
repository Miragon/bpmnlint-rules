import { describe, expect, it } from 'vitest';

import type { ModdleElement } from '../../src/core/moddle';
import { ExternalTask } from '../../src/toolkit/engine/ExternalTask';

function implementationWith(attributes: Record<string, string>): ModdleElement {
  return { get: (name: string) => attributes[name] } as ModdleElement;
}

describe('ExternalTask.namespaceOf', () => {
  it('names the namespace that marks the implementation as external', () => {
    expect(ExternalTask.namespaceOf(implementationWith({ 'camunda:type': 'external' }))).toBe(
      'camunda',
    );
    expect(ExternalTask.namespaceOf(implementationWith({ 'operaton:type': 'external' }))).toBe(
      'operaton',
    );
  });

  it('returns undefined for an implementation that is not an external task', () => {
    expect(ExternalTask.namespaceOf(implementationWith({}))).toBeUndefined();
    expect(
      ExternalTask.namespaceOf(implementationWith({ 'camunda:class': 'com.example.Delegate' })),
    ).toBeUndefined();
    expect(
      ExternalTask.namespaceOf(implementationWith({ 'zeebe:type': 'external' })),
    ).toBeUndefined();
  });
});
