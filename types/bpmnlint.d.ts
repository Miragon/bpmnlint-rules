/**
 * bpmnlint ships `lib/types.d.ts` but declares no `types` entry in its package.json, and its deep
 * entry points (rules, configs, resolvers, testers) ship no types at all. These ambient
 * declarations bridge that gap so the bundled resolver can statically import every rule/config
 * module and the tests can drive the linter core.
 *
 * Every module below uses ESM `export default` (not `export =`) so `verbatimModuleSyntax` accepts
 * `import x from '...'` without `esModuleInterop` — the runtime CJS/ESM interop is tsup's job.
 */

declare module 'bpmnlint' {
  export * from 'bpmnlint/lib/types';
}

declare module 'bpmnlint-utils' {
  /** Inheritance-aware moddle type test. An unqualified type is read as `bpmn:<type>`. */
  export function is(node: unknown, type: string): boolean;
  export function isAny(node: unknown, types: string[]): boolean;
}

/** A bpmnlint rule module — a factory returning a `{ check }` visitor. */
declare module 'bpmnlint/rules/*' {
  const rule: unknown;
  export default rule;
}

/** A bpmnlint shareable config module (`recommended`, `all`, `correctness`). */
declare module 'bpmnlint/config/*' {
  const config: { rules?: Record<string, unknown>; extends?: string | string[] };
  export default config;
}

declare module 'bpmnlint/lib/resolver/static-resolver' {
  /** Resolves rules/configs from a plain `{ 'rule:pkg/name': module }` cache. */
  export default class StaticResolver {
    constructor(cache: Record<string, unknown>);
    resolveRule(pkg: string, ruleName: string): unknown;
    resolveConfig(pkg: string, configName: string): unknown;
  }
}

declare module 'bpmnlint/lib/linter' {
  export type LintReport = { id: string; message: string; category?: string };

  /** The linter core, driven directly by the integration tests. */
  export default class Linter {
    constructor(options?: { resolver?: unknown; config?: unknown });
    lint(moddleRoot: unknown, config?: unknown): Promise<Record<string, LintReport[]>>;
    resolveRule(name: string, config?: unknown): Promise<unknown>;
  }
}

declare module 'bpmnlint/lib/testers/helper' {
  export type CreatedModdle = { root: unknown; moddle: unknown; warnings: unknown[] };

  export function createModdle(
    xml: string,
    elementType?: string | object,
    moddleExtensions?: object,
  ): Promise<CreatedModdle>;

  export function readModdle(
    filePath: string | URL,
    elementType?: string,
    moddleExtensions?: object,
  ): Promise<CreatedModdle>;
}

declare module 'bpmnlint/lib/testers/rule-tester' {
  export type ExpectedReport = { id: string; message: string; path?: string[] | null };

  export type TestCase = {
    moddleElement: Promise<unknown> | unknown;
    name?: string;
    config?: unknown;
    /** A custom `it` — pass `it.skip`/`it.only` to focus a case during development. */
    it?: unknown;
    report?: ExpectedReport | ExpectedReport[];
  };

  export function verify(
    ruleName: string,
    rule: unknown,
    testCases: { valid: TestCase[]; invalid: TestCase[] },
  ): void;
}
