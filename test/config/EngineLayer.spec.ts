import { getDefaultLintConfig, getEngineLintConfig } from '../../src';

describe('engine layers per version', () => {
  it('extends the latest camunda-compat config and the Miragon engine layer without a version', () => {
    expect(getEngineLintConfig('c8').extends).toEqual([
      'plugin:camunda-compat/camunda-cloud-8-10',
      'plugin:@miragon/rules/camunda-8',
    ]);
    expect(getEngineLintConfig('c7').extends).toEqual([
      'plugin:camunda-compat/camunda-platform-7-24',
      'plugin:@miragon/rules/camunda-7',
    ]);
  });

  it.each([
    ['8.9', 'camunda-cloud-8-9'],
    ['8.9.3', 'camunda-cloud-8-9'],
    ['8.42', 'camunda-cloud-8-10'],
    ['7.21.0', 'camunda-platform-7-21'],
    ['7.10', 'camunda-platform-7-19'],
  ])('picks the camunda-compat config for %s', (version, configName) => {
    const engine = version.startsWith('7') ? 'c7' : 'c8';
    expect(getEngineLintConfig(engine, version).extends).toContain(
      `plugin:camunda-compat/${configName}`,
    );
  });

  it('passes the default lint config the version too', () => {
    expect(getDefaultLintConfig({ engine: 'c8', version: '8.6' }).extends).toEqual([
      'bpmnlint:recommended',
      'plugin:@miragon/rules/recommended-for-automation',
      'plugin:camunda-compat/camunda-cloud-8-6',
      'plugin:@miragon/rules/camunda-8',
    ]);
  });

  it('embeds the moddle extension the engine rules read', () => {
    expect(Object.keys(getEngineLintConfig('c8').moddleExtensions ?? {})).toEqual(['zeebe']);
    expect(Object.keys(getEngineLintConfig('c7').moddleExtensions ?? {})).toEqual(['camunda']);
  });
});
