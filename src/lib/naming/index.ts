/**
 * The public `naming` namespace: element-id conventions, value schemes for topics and message
 * names, and the cases both share.
 */
export { DEFAULT_PREFIXES, ElementIdConvention } from './ElementIdConvention';
export type { ElementIdNamingConfig, PrefixMap, QualifierMode } from './ElementIdConvention';
export { ValueNamingScheme } from './ValueNamingScheme';
export type { ValueNamingConfig } from './ValueNamingScheme';
export { resolveCase } from './utils/cases';
export type { CaseSpec } from './utils/cases';
export { isExpression } from './utils/expressions';
export { isGeneratedId } from './utils/generatedIds';
