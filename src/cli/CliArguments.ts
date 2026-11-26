import { parseArgs } from 'node:util';

import { UsageError } from './UsageError';

const PRESET_NAMES = ['recommended-for-modeling', 'recommended-for-automation', 'strict'] as const;
export type PresetName = (typeof PRESET_NAMES)[number];

const FORMAT_NAMES = ['text', 'json', 'markdown', 'github'] as const;
export type FormatName = (typeof FORMAT_NAMES)[number];

/**
 * One requested output: a format, written to a file or, without one, to stdout.
 */
export interface OutputTarget {
  readonly format: FormatName;
  readonly file?: string;
}

const DEFAULT_PATTERN = '**/*.bpmn';

const USAGE = `Usage: miragon-bpmnlint [options] [<file|glob>...]

Lints BPMN files with bpmnlint and the bundled Miragon, Camunda and structural rules, and reports
the findings in one or more formats. Without files, lints ${DEFAULT_PATTERN}.

Options:
  --config <file>           bpmnlint config (default: .bpmnlintrc in the working directory)
  --preset <name>           use a preset instead of a config file:
                            ${PRESET_NAMES.join(', ')}
                            (default without any config: recommended-for-automation)
  --format <name>[=<file>]  output format, repeatable: ${FORMAT_NAMES.join(', ')}
                            (default: text to stdout; =<file> writes to a file)
  --files-from <file>       lint only the files listed in <file> (one path per line)
                            that also match the globs, e.g. the files a pull request changed
  --path-base <dir>         show paths relative to <dir> (default: the working directory)
  --max-length <chars>      cap the markdown output, leaving out what does not fit
  --help                    show this help

Exit codes: 0 no errors (warnings allowed), 1 at least one error finding, 2 usage or config error.
`;

/**
 * The parsed and validated command line of `miragon-bpmnlint`.
 */
export class CliArguments {
  private constructor(
    readonly patterns: readonly string[],
    readonly outputs: readonly OutputTarget[],
    readonly help: boolean,
    readonly configFile?: string,
    readonly preset?: PresetName,
    readonly filesFrom?: string,
    readonly pathBase?: string,
    readonly maxLength?: number,
  ) {}

  static readonly usage = USAGE;

  static parse(argv: readonly string[]): CliArguments {
    const { values, positionals } = CliArguments.parseRaw(argv);

    if (values.config !== undefined && values.preset !== undefined) {
      throw new UsageError('--config and --preset cannot be combined; pick one.');
    }

    return new CliArguments(
      positionals.length > 0 ? positionals : [DEFAULT_PATTERN],
      (values.format ?? ['text']).map((format) => CliArguments.outputTarget(format)),
      values.help ?? false,
      values.config,
      values.preset === undefined ? undefined : CliArguments.presetName(values.preset),
      values['files-from'],
      values['path-base'],
      values['max-length'] === undefined
        ? undefined
        : CliArguments.positiveInteger(values['max-length']),
    );
  }

  private static parseRaw(argv: readonly string[]) {
    try {
      return parseArgs({
        args: [...argv],
        allowPositionals: true,
        strict: true,
        options: {
          config: { type: 'string' },
          preset: { type: 'string' },
          format: { type: 'string', multiple: true },
          'files-from': { type: 'string' },
          'path-base': { type: 'string' },
          'max-length': { type: 'string' },
          help: { type: 'boolean' },
        },
      });
    } catch (error) {
      throw new UsageError((error as Error).message);
    }
  }

  private static outputTarget(value: string): OutputTarget {
    const separator = value.indexOf('=');
    const name = separator === -1 ? value : value.slice(0, separator);
    const file = separator === -1 ? undefined : value.slice(separator + 1);
    if (!(FORMAT_NAMES as readonly string[]).includes(name)) {
      throw new UsageError(`Unknown format <${name}>; use one of ${FORMAT_NAMES.join(', ')}.`);
    }
    if (file === '') {
      throw new UsageError(`--format ${name}= needs a file name after the "=".`);
    }
    return file === undefined
      ? { format: name as FormatName }
      : { format: name as FormatName, file };
  }

  private static presetName(value: string): PresetName {
    if (!(PRESET_NAMES as readonly string[]).includes(value)) {
      throw new UsageError(`Unknown preset <${value}>; use one of ${PRESET_NAMES.join(', ')}.`);
    }
    return value as PresetName;
  }

  private static positiveInteger(value: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new UsageError(`--max-length needs a positive whole number, got <${value}>.`);
    }
    return parsed;
  }
}
