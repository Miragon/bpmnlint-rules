import { configs } from '../../src';
import { ElementIdNamingSetting } from '../../src/lib/naming';
import { PRESET_SEVERITIES } from '../../src/lib/naming/ElementIdNamingSetting';

const RULE_KEY = '@miragon/rules/element-id-naming';

describe('ElementIdNamingSetting.fromBpmnlintrc', () => {
  it('is off when nothing sets the rule', () => {
    expect(ElementIdNamingSetting.fromBpmnlintrc({})).toMatchObject({ severity: 'off' });
  });

  it.each([
    [0, 'off'],
    [1, 'warn'],
    [2, 'error'],
    ['warn', 'warn'],
  ] as const)('reads the bare severity %s as %s', (severity, expected) => {
    const setting = ElementIdNamingSetting.fromBpmnlintrc({ rules: { [RULE_KEY]: severity } });
    expect(setting).toEqual(expect.objectContaining({ severity: expected, config: undefined }));
  });

  it('reads a [severity, config] tuple', () => {
    const config = { case: 'snake_case', prefixes: { 'bpmn:Task': 'task_' } };
    const setting = ElementIdNamingSetting.fromBpmnlintrc({ rules: { [RULE_KEY]: [2, config] } });
    expect(setting).toMatchObject({ severity: 'error', config });
  });

  it('falls back to the last extended preset that sets the rule', () => {
    const setting = ElementIdNamingSetting.fromBpmnlintrc({
      extends: [
        'plugin:@miragon/rules/all',
        'plugin:@miragon/rules/recommended-for-automation',
        'bpmnlint:recommended',
      ],
    });
    expect(setting.severity).toBe('warn');
  });

  it('accepts extends as a single string', () => {
    const setting = ElementIdNamingSetting.fromBpmnlintrc({ extends: 'plugin:@miragon/rules/all' });
    expect(setting.severity).toBe('error');
  });

  it('lets the own rules block win over an extended preset', () => {
    const setting = ElementIdNamingSetting.fromBpmnlintrc({
      extends: 'plugin:@miragon/rules/all',
      rules: { [RULE_KEY]: 'off' },
    });
    expect(setting.severity).toBe('off');
  });
});

describe('PRESET_SEVERITIES', () => {
  it('covers exactly the shipped presets', () => {
    expect(Object.keys(PRESET_SEVERITIES).sort()).toEqual(Object.keys(configs).sort());
  });

  it.each(Object.keys(configs))('matches the %s preset', (preset) => {
    expect(PRESET_SEVERITIES[preset]).toBe(configs[preset]?.rules?.[RULE_KEY]);
  });
});
