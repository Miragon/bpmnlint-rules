import { globSync } from 'node:fs';
import path from 'node:path';

import { defineConfig } from 'tsup';

/**
 * Dual ESM + CJS build.
 *
 * `src/index.ts` is the public API + bpmnlint-plugin default export. Each of our own rules
 * (`src/rules/miragon/<name>/index.ts`) is ALSO a build entry so it lands at
 * `dist/rules/miragon/<name>.{js,cjs}` — that lets the plugin's classic `rules` map point at real,
 * individually `require`-able files (bpmnlint's node-resolver `require()`s a rule by path), and lets
 * consumers import a single rule.
 *
 * The bundled upstream packages (bpmnlint, camunda-compat) are external: they are declared
 * dependencies and resolved from the consumer's `node_modules`, so a rule instance we import and a
 * `Linter` the consumer constructs share one copy.
 *
 * The two moddle descriptor JSONs are the exception: they are inlined (`noExternal`). Node's ESM
 * loader only imports JSON with `with { type: 'json' }`, and the build cannot emit that attribute:
 * esbuild drops it at `target: 'es2022'`, and tsup's rollup tree-shake pass rewrites it to the
 * `assert` form that Node 22 rejects. The descriptors are plain data, so the consumer does not need
 * to share our copy.
 *
 * The declarations come from two configs. tsup builds them in one pass over every entry, and the
 * types the rules share with `src/index.ts` (the `naming` ones, from `element-id-naming`) land in
 * shared chunks; a namespace that re-exports from such a chunk declares each type as a value
 * (`declare const X: typeof X`), so `naming.QualifierMode` stops being a type. So the first config
 * declares the rules only and the second declares `src/index.ts` on its own. The two run in
 * parallel and tsup's `clean` would wipe the other config's output, so `npm run build` cleans
 * `dist` once up front instead.
 */
const ruleEntries = Object.fromEntries(
  globSync('src/rules/miragon/*/index.ts').map((file) => [
    `rules/miragon/${path.basename(path.dirname(file))}`,
    file,
  ]),
);

const external = [
  'bpmnlint',
  'bpmnlint-utils',
  'bpmnlint-plugin-camunda-compat',
  'bpmn-moddle',
  'camunda-bpmn-moddle',
  'zeebe-bpmn-moddle',
];

export default defineConfig([
  {
    entry: { index: 'src/index.ts', ...ruleEntries },
    format: ['esm', 'cjs'],
    dts: { entry: ruleEntries },
    sourcemap: true,
    treeshake: true,
    target: 'es2022',
    external,
    noExternal: [/^(camunda|zeebe)-bpmn-moddle\/resources\/[^/]+\.json$/],
  },
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: { only: true },
    target: 'es2022',
    external,
  },
]);
