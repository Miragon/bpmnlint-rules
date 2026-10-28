import { createModdle } from 'bpmnlint/lib/testers/helper';

import { ElementIdConvention, resolveCase } from '../../src/lib/naming';
import type { ElementIdNamingConfig } from '../../src/lib/naming';
import type { ModdleElement } from '../../src/lib/moddle';

interface ElementFactory {
  create: (type: string, attrs?: object) => ModdleElement;
}

let moddle: ElementFactory;

beforeAll(async () => {
  const created = await createModdle(
    '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="definitions" />',
  );
  moddle = created.moddle as ElementFactory;
});

const element = (type: string): ModdleElement => moddle.create(type, { id: 'element' });

const messageStartEvent = (): ModdleElement =>
  moddle.create('bpmn:StartEvent', {
    id: 'element',
    eventDefinitions: [moddle.create('bpmn:MessageEventDefinition')],
  });

describe('ElementIdConvention.prefixOf', () => {
  const convention = new ElementIdConvention();

  it('resolves the prefix of the exact type', () => {
    expect(convention.prefixOf(element('bpmn:ServiceTask'))).toBe('serviceTask_');
  });

  it.each([
    ['bpmn:Transaction', 'subProcess_'],
    ['bpmn:ExclusiveGateway', 'gateway_'],
  ])('lets %s inherit %s', (type, prefix) => {
    expect(convention.prefixOf(element(type))).toBe(prefix);
  });

  it('returns null for an unconfigured type', () => {
    expect(convention.prefixOf(element('bpmn:Process'))).toBeNull();
  });

  it('returns null for a type switched off', () => {
    const switchedOff = new ElementIdConvention({ prefixes: { 'bpmn:Task': false } });

    expect(switchedOff.prefixOf(element('bpmn:Task'))).toBeNull();
  });
});

describe('ElementIdConvention.prefixesFor', () => {
  it.each([
    ['off', ['startEvent_']],
    ['optional', ['startEvent_', 'messageStartEvent_']],
    ['required', ['messageStartEvent_']],
  ] as const)('accepts on a message start event in %s mode: %j', (mode, prefixes) => {
    const convention = new ElementIdConvention({ eventDefinitionQualifier: mode });

    expect(convention.prefixesFor(messageStartEvent())).toEqual(prefixes);
  });

  it('falls back to the plain prefix for a start event without definition in required mode', () => {
    const convention = new ElementIdConvention({ eventDefinitionQualifier: 'required' });

    expect(convention.prefixesFor(element('bpmn:StartEvent'))).toEqual(['startEvent_']);
  });

  it('ignores qualifiers on a non-event', () => {
    const convention = new ElementIdConvention({ eventDefinitionQualifier: 'required' });

    expect(convention.prefixesFor(element('bpmn:ServiceTask'))).toEqual(['serviceTask_']);
  });

  it('is empty for a type without a prefix', () => {
    expect(new ElementIdConvention().prefixesFor(element('bpmn:Process'))).toEqual([]);
  });
});

describe('ElementIdConvention.case', () => {
  it('defaults to camelCase', () => {
    expect(new ElementIdConvention().case).toBe(resolveCase('camelCase'));
  });

  it('resolves a configured case', () => {
    expect(new ElementIdConvention({ case: 'PascalCase' }).case).toBe(resolveCase('PascalCase'));
  });

  it('falls back to PascalCase for an unknown case name', () => {
    expect(new ElementIdConvention({ case: 'toString' }).case).toBe(resolveCase('PascalCase'));
  });
});

describe('ElementIdConvention.qualifier', () => {
  it('defaults to optional', () => {
    expect(new ElementIdConvention().qualifier).toBe('optional');
  });

  it('keeps a valid mode', () => {
    expect(new ElementIdConvention({ eventDefinitionQualifier: 'required' }).qualifier).toBe(
      'required',
    );
  });

  it('falls back to optional for an invalid mode', () => {
    const invalid = { eventDefinitionQualifier: 'always' } as unknown as ElementIdNamingConfig;

    expect(new ElementIdConvention(invalid).qualifier).toBe('optional');
  });
});
