/**
 * The type half of the distro smoke test. `smoke.cjs` copies this file into its throwaway consumer
 * project as `types.mts` and as `types.cts` and type-checks both there, so `naming` resolves once
 * through the ESM declarations (`dist/index.d.ts`) and once through the CJS ones
 * (`dist/index.d.cts`) of the installed tarball. Every type member of `naming` is used as a type:
 * one that the build declared as a value only fails here with TS2749.
 */
import { naming } from '@miragon/bpmnlint-plugin-rules';

const qualifier: naming.QualifierMode = 'optional';
const prefixes: naming.PrefixMap = { 'bpmn:StartEvent': 'startEvent_' };
const elementIdConfig: naming.ElementIdNamingConfig = {
  prefixes,
  case: 'camelCase',
  eventDefinitionQualifier: qualifier,
};
const valueConfig: naming.ValueNamingConfig = { separator: '.', case: 'kebab-case' };

const convention: naming.ElementIdConvention = new naming.ElementIdConvention(elementIdConfig);
const scheme: naming.ValueNamingScheme = new naming.ValueNamingScheme(valueConfig);
const caseSpecs: naming.CaseSpec[] = [convention.case, scheme.case];

/**
 * Fails to compile when a case name is missing here or no longer exists.
 */
const everyCaseName: Record<naming.CaseName, true> = {
  PascalCase: true,
  camelCase: true,
  snake_case: true,
  'kebab-case': true,
  any: true,
};
const caseNames: readonly naming.CaseName[] = naming.CASE_NAMES;

export { caseNames, caseSpecs, everyCaseName };
