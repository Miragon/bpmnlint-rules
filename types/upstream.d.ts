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
