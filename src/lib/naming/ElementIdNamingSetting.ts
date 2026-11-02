import type { BpmnlintConfig, RuleSetting, RuleSeverity } from '../bpmnlint-config';
import type { ElementIdNamingConfig } from './ElementIdConvention';

type Severity = 'off' | 'warn' | 'error';

const RULE_KEY = '@miragon/rules/element-id-naming';
const PRESET_PREFIX = 'plugin:@miragon/rules/';
const SEVERITY_BY_NUMBER: Severity[] = ['off', 'warn', 'error'];

/**
 * The rule's setting in each Miragon preset, kept here so reading a `.bpmnlintrc` never loads the
 * presets (they pull every rule). A test keeps it equal to `configs[preset].rules`.
 */
export const PRESET_SEVERITIES: Record<string, Severity> = {
  'recommended-for-modeling': 'off',
  'recommended-for-automation': 'warn',
  all: 'error',
};

/** The effective setting of `@miragon/rules/element-id-naming` in a parsed `.bpmnlintrc`. */
export class ElementIdNamingSetting {
  readonly severity: Severity;
  readonly config: ElementIdNamingConfig | undefined;

  private constructor(severity: Severity, config?: ElementIdNamingConfig) {
    this.severity = severity;
    this.config = config;
  }

  static fromBpmnlintrc(bpmnlintrc: BpmnlintConfig): ElementIdNamingSetting {
    const ownSetting = bpmnlintrc.rules?.[RULE_KEY];
    if (ownSetting !== undefined) {
      return ElementIdNamingSetting.fromRuleSetting(ownSetting);
    }
    return new ElementIdNamingSetting(ElementIdNamingSetting.presetSeverity(bpmnlintrc.extends));
  }

  private static fromRuleSetting(setting: RuleSetting): ElementIdNamingSetting {
    if (Array.isArray(setting)) {
      const [severity, config] = setting;
      return new ElementIdNamingSetting(
        ElementIdNamingSetting.normalize(severity),
        config as ElementIdNamingConfig | undefined,
      );
    }
    return new ElementIdNamingSetting(ElementIdNamingSetting.normalize(setting));
  }

  private static presetSeverity(extendsValue: BpmnlintConfig['extends']): Severity {
    const extended = typeof extendsValue === 'string' ? [extendsValue] : (extendsValue ?? []);
    const presetSeverities = extended
      .filter((entry) => entry.startsWith(PRESET_PREFIX))
      .map((entry) => PRESET_SEVERITIES[entry.slice(PRESET_PREFIX.length)])
      .filter((severity) => severity !== undefined);
    return presetSeverities.at(-1) ?? 'off';
  }

  private static normalize(severity: RuleSeverity): Severity {
    return typeof severity === 'number'
      ? (SEVERITY_BY_NUMBER[severity] ?? 'off')
      : (severity as Severity);
  }
}
