// `vitest.config.ts` runs with `globals: true`, so `describe` / `it` / `expect` are ambient at
// runtime. This reference makes them ambient for the typechecker too. bpmnlint's RuleTester reaches
// the BDD globals internally and needs no help; the resolver/sync/integration specs call them
// directly.
/// <reference types="vitest/globals" />
