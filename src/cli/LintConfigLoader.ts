import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import type { BpmnlintConfig } from '../core/bpmnlint-config';
import { recommendedForAutomation, recommendedForModeling } from '../presets/recommended';
import { strict } from '../presets/strict';
import { moddleExtension as camunda7Moddle } from '../rules/camunda-7';
import { moddleExtension as camunda8Moddle } from '../rules/camunda-8';
import type { PresetName } from './CliArguments';
import { UsageError } from './UsageError';

const RC_FILE = '.bpmnlintrc';
const DEFAULT_PRESET: PresetName = 'recommended-for-automation';

const PRESETS: Record<PresetName, Readonly<BpmnlintConfig>> = {
  'recommended-for-modeling': recommendedForModeling,
  'recommended-for-automation': recommendedForAutomation,
  strict,
};

/**
 * The moddle descriptors this package bundles, by the specifier a `.bpmnlintrc` names them with,
 * so a config from the docs works without `camunda-bpmn-moddle`/`zeebe-bpmn-moddle` installed.
 */
const BUNDLED_MODDLE_DESCRIPTORS: Record<string, unknown> = {
  'camunda-bpmn-moddle/resources/camunda.json': camunda7Moddle.descriptor,
  'zeebe-bpmn-moddle/resources/zeebe.json': camunda8Moddle.descriptor,
};

/**
 * A config ready for the linter, and a short description of where it came from.
 */
export interface LoadedConfig {
  readonly config: BpmnlintConfig;
  readonly source: string;
}

/**
 * Picks the config for a run, in this order: an explicit `--config` file, an explicit `--preset`,
 * the working directory's `.bpmnlintrc`, the `recommended-for-automation` preset.
 *
 * A config file's `moddleExtensions` must name JSON descriptors, which are read as data, not
 * `require`d. The plugins a config extends are a different matter: bpmnlint loads them with
 * Node's `require` from the working directory, so only lint configs you trust to run code.
 */
export class LintConfigLoader {
  constructor(private readonly cwd: string) {}

  load(options: {
    configFile?: string | undefined;
    preset?: PresetName | undefined;
  }): LoadedConfig {
    if (options.configFile !== undefined) {
      return this.fromFile(options.configFile);
    }
    if (options.preset !== undefined) {
      return this.fromPreset(options.preset);
    }
    if (existsSync(path.join(this.cwd, RC_FILE))) {
      return this.fromFile(RC_FILE);
    }
    return this.fromPreset(DEFAULT_PRESET);
  }

  private fromPreset(preset: PresetName): LoadedConfig {
    return { config: { ...PRESETS[preset] }, source: `preset ${preset}` };
  }

  private fromFile(configFile: string): LoadedConfig {
    const config = this.readJson(path.resolve(this.cwd, configFile), `config ${configFile}`);
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      throw new UsageError(`Config ${configFile} must be a JSON object.`);
    }
    const { moddleExtensions, ...rest } = config as BpmnlintConfig;
    const loaded: BpmnlintConfig = moddleExtensions
      ? { ...rest, moddleExtensions: this.loadModdleExtensions(moddleExtensions) }
      : rest;
    return { config: loaded, source: configFile };
  }

  private loadModdleExtensions(extensions: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(extensions).map(([prefix, extension]) => [
        prefix,
        typeof extension === 'string' ? this.loadDescriptor(prefix, extension) : extension,
      ]),
    );
  }

  private loadDescriptor(prefix: string, specifier: string): unknown {
    const descriptorFile = this.resolveFromCwd(specifier);
    if (descriptorFile === undefined) {
      const bundled = BUNDLED_MODDLE_DESCRIPTORS[specifier];
      if (bundled === undefined) {
        throw new UsageError(`Cannot find moddle extension <${prefix}> at ${specifier}.`);
      }
      return bundled;
    }
    if (!descriptorFile.endsWith('.json')) {
      throw new UsageError(
        `Moddle extension <${prefix}> must be a JSON descriptor, got ${specifier}.`,
      );
    }
    return this.readJson(descriptorFile, `moddle extension <${prefix}>`);
  }

  private resolveFromCwd(specifier: string): string | undefined {
    try {
      return createRequire(path.join(this.cwd, 'noop.js')).resolve(specifier);
    } catch {
      return undefined;
    }
  }

  private readJson(file: string, description: string): unknown {
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      throw new UsageError(`Cannot read ${description} (${file}).`);
    }
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new UsageError(`${description} is not valid JSON: ${(error as Error).message}`);
    }
  }
}
