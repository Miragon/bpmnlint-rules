/**
 * Ambient declarations for the other untyped upstream packages the bundled resolver and config
 * builder statically import: the camunda-compat plugin (its index + every referenced rule module)
 * and the two moddle descriptor JSONs embedded into the zero-config default.
 */

declare module 'bpmnlint-plugin-camunda-compat' {
  /** The plugin index — `configs` is plain data keyed by `<platform>-<version>`. */
  const plugin: {
    configs: Record<string, { rules?: Record<string, unknown>; extends?: string | string[] }>;
    rules: Record<string, unknown>;
  };
  export default plugin;
}

/** Every camunda-compat rule module (camunda-cloud/* and camunda-platform/*). */
declare module 'bpmnlint-plugin-camunda-compat/rules/*' {
  const rule: unknown;
  export default rule;
}

/** Moddle descriptors embedded into the zero-config default so `zeebe:`/`camunda:` props parse. */
declare module 'camunda-bpmn-moddle/resources/camunda.json' {
  const descriptor: unknown;
  export default descriptor;
}

declare module 'zeebe-bpmn-moddle/resources/zeebe.json' {
  const descriptor: unknown;
  export default descriptor;
}

/** camunda-compat's report helper: reports each error on `node`, adding the element's name. */
declare module 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js' {
  export function reportErrors(
    node: unknown,
    reporter: { report(id: string, message: string, details?: object): void },
    errors: CompatError | CompatError[],
  ): void;

  /** One problem as camunda-compat describes it: its message, the path to it, its error type. */
  export interface CompatError {
    message: string;
    path?: (string | number)[] | null;
    data: { type: string; [key: string]: unknown };
    [key: string]: unknown;
  }
}

/** camunda-compat's error types, the `data.type` of every report (`camunda.propertyRequired`, ...). */
declare module 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js' {
  export const ERROR_TYPES: Readonly<{
    CHILD_ELEMENT_OF_TYPE_REQUIRED: string;
    CHILD_ELEMENT_TYPE_NOT_ALLOWED: string;
    CONNECTORS_PROPERTY_VALUE_NOT_ALLOWED: string;
    ELEMENT_COLLAPSED_NOT_ALLOWED: string;
    ELEMENT_MULTIPLE_NOT_ALLOWED: string;
    ELEMENT_TYPE_NOT_ALLOWED: string;
    ELEMENT_PROPERTY_VALUE_DUPLICATED: string;
    EVENT_BASED_GATEWAY_TARGET_NOT_ALLOWED: string;
    EXPRESSION_NOT_ALLOWED: string;
    EXPRESSION_REQUIRED: string;
    EXPRESSION_VALUE_NOT_ALLOWED: string;
    EXTENSION_ELEMENT_NOT_ALLOWED: string;
    EXTENSION_ELEMENT_REQUIRED: string;
    FEEL_EXPRESSION_INVALID: string;
    FEEL_EXPRESSION_UNSUPPORTED_FUNCTION: string;
    LOOP_NOT_ALLOWED: string;
    ATTACHED_TO_REF_ELEMENT_TYPE_NOT_ALLOWED: string;
    PROPERTY_DEPENDENT_REQUIRED: string;
    PROPERTY_NOT_ALLOWED: string;
    PROPERTY_DEPRECATED: string;
    PROPERTY_REQUIRED: string;
    PROPERTY_TYPE_NOT_ALLOWED: string;
    PROPERTY_VALUE_DUPLICATED: string;
    PROPERTY_VALUES_DUPLICATED: string;
    PROPERTY_VALUE_NOT_ALLOWED: string;
    PROPERTY_VALUE_REQUIRED: string;
    SECRET_EXPRESSION_FORMAT_DEPRECATED: string;
    SECRET_EXPRESSION_FORMAT_LEGACY: string;
    SECRET_REFERENCE_STRING_LITERAL_NOT_ALLOWED: string;
    SECRET_REFERENCE_INSIDE_LIST_NOT_ALLOWED: string;
    SECRET_REFERENCE_INSIDE_IF_BRANCH_CONTEXT_NOT_ALLOWED: string;
    AGENT_FEEL_FUNCTION_NAME_INVALID: string;
    AGENT_FEEL_KEY_MISSING: string;
    AGENT_FEEL_KEY_TYPE_INVALID: string;
    AGENT_FEEL_KEY_PREFIX_MISSING: string;
    AGENT_FEEL_DESCRIPTION_TYPE_INVALID: string;
    AGENT_FEEL_WRONG_CONTEXT: string;
    AGENT_FEEL_KEY_SEGMENTS_INVALID: string;
    AGENT_FEEL_KEY_DUPLICATE: string;
    AGENT_FEEL_NON_ENTRY_ELEMENT: string;
    AGENT_TOOL_OUTPUT_KEY_INVALID: string;
    AGENT_TOOL_OUTPUT_KEY_CASING_INVALID: string;
    AGENT_TOOL_OUTPUT_KEY_OVERWRITE: string;
    AGENT_TOOL_RESULT_MISSING: string;
    AGENT_TOOL_DOCUMENTATION_MISSING: string;
  }>;
}

/** camunda-compat's element checks, returning errors for `reportErrors`. */
declare module 'bpmnlint-plugin-camunda-compat/rules/utils/element.js' {
  import type { CompatError } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

  export interface PropertyCheck {
    required?: boolean;
    dependentRequired?: string;
    type?: string | string[];
    value?: unknown;
    allowed?: boolean | ((value: unknown) => boolean);
    allowedVersion?: string;
  }

  export function hasProperties(
    node: unknown,
    properties: Record<string, PropertyCheck>,
    parentNode?: unknown,
    nodePath?: (string | number)[],
  ): CompatError[];
  export function hasProperty(
    node: unknown,
    propertyNames: string | string[],
    parentNode?: unknown,
  ): CompatError[];
  export function findExtensionElement(node: unknown, types: string | string[]): any;
  export function findExtensionElements(node: unknown, types: string | string[]): any[];
  export function getEventDefinition(node: unknown): any;
}
