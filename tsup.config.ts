import { defineConfig } from 'tsup';

/**
 * Dual ESM + CJS build.
 *
 * `src/index.ts` is the public API + bpmnlint-plugin default export. Each of our own rules under
 * `src/rules/miragon/*` is ALSO a build entry so it lands at `dist/rules/miragon/<name>.{js,cjs}`
 * — that lets the plugin's classic `rules` map point at real, individually `require`-able files
 * (bpmnlint's node-resolver `require()`s a rule by path), and lets consumers import a single rule.
 *
 * The bundled upstream packages (bpmnlint, camunda-compat, the moddle descriptors) are external:
 * they are declared dependencies and resolved from the consumer's `node_modules`, so a rule
 * instance we import and a `Linter` the consumer constructs share one copy.
 */
export default defineConfig({
  entry: ['src/index.ts', 'src/rules/miragon/*.ts'],
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
});
