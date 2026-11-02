/**
 * camunda-compat's `camunda-platform-7-<minor>` configs of every engine version, on top of the latest
 * layer in `index.ts`; they all reference the same rule module. Only the `./camunda-7` entry imports
 * this. Kept honest by `test/rules/camunda-sync.spec.ts`.
 */
import camundaCompat from 'bpmnlint-plugin-camunda-compat';

import type { ResolverEntries } from '../../lib/bpmnlint-config';

import { configName, moddleExtension, resolverEntries as latestEntries } from './index';

export { configName, moddleExtension };

const PLUGIN = 'bpmnlint-plugin-camunda-compat';
const CONFIG_PREFIX = 'camunda-platform-7-';

/** Every `camunda-platform-7-<minor>` config camunda-compat ships, keyed by `7.<minor>`. */
export const configNamesByVersion: Record<string, string> = Object.fromEntries(
  Object.keys(camundaCompat.configs)
    .filter((name) => name.startsWith(CONFIG_PREFIX))
    .map((name) => [`7.${name.slice(CONFIG_PREFIX.length)}`, name]),
);

export const resolverEntries: ResolverEntries = {
  ...latestEntries,
  ...Object.fromEntries(
    Object.values(configNamesByVersion).map((name) => [
      `config:${PLUGIN}/${name}`,
      camundaCompat.configs[name],
    ]),
  ),
};
