/**
 * The resolver contract bpmnlint's `Linter` consumes. Declared here (rather than imported from the
 * untyped `bpmnlint` package) so a consumer can type a resolver seam without an ambient shim.
 */
export interface Resolver {
  resolveRule(pkg: string, ruleName: string): unknown;
  resolveConfig(pkg: string, configName: string): unknown;
}
