import { describe, expect, it } from 'vitest';

import { CliArguments } from '../../src/cli/CliArguments';
import { UsageError } from '../../src/cli/UsageError';

describe('CliArguments', () => {
  it('defaults to all BPMN files and the text format on stdout', () => {
    const args = CliArguments.parse([]);

    expect(args.patterns).toEqual(['**/*.bpmn']);
    expect(args.outputs).toEqual([{ format: 'text' }]);
  });

  it('reads repeated formats with optional target files', () => {
    const args = CliArguments.parse(['--format', 'github', '--format', 'markdown=out/report.md']);

    expect(args.outputs).toEqual([
      { format: 'github' },
      { format: 'markdown', file: 'out/report.md' },
    ]);
  });

  it('takes everything after -- as a file, even when it looks like a flag', () => {
    expect(CliArguments.parse(['--', '--weird.bpmn']).patterns).toEqual(['--weird.bpmn']);
  });

  it.each([
    [['--config', 'a', '--preset', 'strict'], /cannot be combined/],
    [['--preset', 'lenient'], /Unknown preset <lenient>/],
    [['--format', 'sarif'], /Unknown format <sarif>/],
    [['--format', 'json='], /needs a file name/],
    [['--max-length', '0'], /positive whole number/],
    [['--nope'], /Unknown option/],
  ])('rejects %j', (argv, message) => {
    expect(() => CliArguments.parse(argv)).toThrow(UsageError);
    expect(() => CliArguments.parse(argv)).toThrow(message);
  });
});
