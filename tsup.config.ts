import { globSync } from 'node:fs';
import path from 'node:path';

import { defineConfig } from 'tsup';

/**
 * Dual ESM + CJS build.
 *
 * `src/index.ts` is the public API + bpmnlint-plugin default export. Each of our own rules under
 * `src/rules/miragon/*` is ALSO a build entry so it lands at `dist/rules/miragon/<name>.{js,cjs}`
 * — that lets the plugin's classic `rules` map point at real, individually `require`-able files
 * (bpmnlint's node-resolver `require()`s a rule by path), and lets consumers import a single rule.
 * A rule with its own helpers is a folder (`src/rules/miragon/<name>/index.ts`) and lands at the
 * same flat path.
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
 */
const folderRuleEntries = Object.fromEntries(
  globSync('src/rules/miragon/*/index.ts').map((file) => [
    `rules/miragon/${path.basename(path.dirname(file))}`,
    file,
  ]),
);

const fileRuleEntries = Object.fromEntries(
  globSync('src/rules/miragon/*.ts').map((file) => [
    `rules/miragon/${path.basename(file, '.ts')}`,
    file,
  ]),
);

export default defineConfig({
  entry: { index: 'src/index.ts', ...fileRuleEntries, ...folderRuleEntries },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  target: 'es2022',
  external: [
    'bpmnlint',
    'bpmnlint-utils',
    'bpmnlint-plugin-camunda-compat',
    'bpmn-moddle',
    'camunda-bpmn-moddle',
    'zeebe-bpmn-moddle',
  ],
  noExternal: [/^(camunda|zeebe)-bpmn-moddle\/resources\/[^/]+\.json$/],
});
