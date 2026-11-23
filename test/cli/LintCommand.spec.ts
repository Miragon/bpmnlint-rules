import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LintCommand } from '../../src/cli/LintCommand';

const FIXTURES = path.resolve(__dirname, '..', 'fixtures');
const CLEAN_MODEL = path.join(FIXTURES, 'valid', 'membership.bpmn');
const GENERATED_IDS_MODEL = path.join(FIXTURES, 'rules', 'no-generated-ids', 'invalid.bpmn');
const C8_SERVICE_TASK_MODEL = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"
  xmlns:modeler="http://camunda.org/schema/modeler/1.0"
  id="definitions_order" targetNamespace="http://bpmn.io/schema/bpmn"
  modeler:executionPlatform="Camunda Cloud" modeler:executionPlatformVersion="8.11.0">
  <bpmn:process id="process_order" isExecutable="true">
    <bpmn:serviceTask id="serviceTask_shipOrder" name="Ship order">
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="shipOrder" />
      </bpmn:extensionElements>
    </bpmn:serviceTask>
  </bpmn:process>
</bpmn:definitions>
`;

/**
 * Runs the command in a project directory outside the repository, so nothing is installed there
 * and every rule comes from the bundled resolver, as on a bare CI runner.
 */
class Project {
  readonly dir = mkdtempSync(path.join(os.tmpdir(), 'miragon-bpmnlint-'));

  add(relativePath: string, source: string): this {
    mkdirSync(path.dirname(path.join(this.dir, relativePath)), { recursive: true });
    cpSync(source, path.join(this.dir, relativePath));
    return this;
  }

  write(relativePath: string, content: string): this {
    writeFileSync(path.join(this.dir, relativePath), content);
    return this;
  }

  read(relativePath: string): string {
    return readFileSync(path.join(this.dir, relativePath), 'utf8');
  }

  async run(...argv: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    let stdout = '';
    let stderr = '';
    const exitCode = await new LintCommand({
      argv,
      cwd: this.dir,
      stdout: { write: (text: string) => (stdout += text) },
      stderr: { write: (text: string) => (stderr += text) },
    }).run();
    return { exitCode, stdout, stderr };
  }

  async json(...argv: string[]): Promise<any> {
    await this.run(...argv, '--format', 'json=report.json');
    return JSON.parse(this.read('report.json'));
  }
}

let project: Project;

beforeEach(() => {
  project = new Project();
});

afterEach(() => {
  rmSync(project.dir, { recursive: true, force: true });
});

describe('miragon-bpmnlint', () => {
  it('exits 0 on a clean model', async () => {
    project.add('models/membership.bpmn', CLEAN_MODEL);

    const result = await project.run('--preset', 'strict');

    expect(result).toMatchObject({ exitCode: 0, stdout: 'No findings in 1 file.\n' });
  });

  it('exits 1 on error findings and reports them with element, line and rule', async () => {
    project.add('models/order.bpmn', GENERATED_IDS_MODEL);

    const report = await project.json('--preset', 'strict');
    const { exitCode } = await project.run('--preset', 'strict');

    expect(exitCode).toBe(1);
    expect(report.files[0].path).toBe('models/order.bpmn');
    expect(report.files[0].findings).toContainEqual({
      severity: 'error',
      rule: '@miragon/rules/no-generated-ids',
      elementId: 'StartEvent_1',
      line: 4,
      message: 'Element id looks generated — give it a readable, stable name',
    });
  });

  it('exits 0 when the findings are only warnings', async () => {
    project.add('order.bpmn', GENERATED_IDS_MODEL);

    const { exitCode } = await project.run('--preset', 'recommended-for-automation');

    expect(exitCode).toBe(0);
  });

  it('uses the .bpmnlintrc, loading a Camunda 8 moddle extension that is not installed', async () => {
    const c8Layer = { extends: 'plugin:camunda-compat/camunda-cloud-8-11' };
    project
      .write('order.bpmn', C8_SERVICE_TASK_MODEL)
      .write('without-zeebe.json', JSON.stringify(c8Layer))
      .write(
        '.bpmnlintrc',
        JSON.stringify({
          ...c8Layer,
          moddleExtensions: { zeebe: 'zeebe-bpmn-moddle/resources/zeebe.json' },
        }),
      );

    const withZeebe = await project.json();
    const withoutZeebe = await project.json('--config', 'without-zeebe.json');

    // The task definition is only visible to the rules when the zeebe descriptor was loaded.
    const missingTaskDefinition = expect.objectContaining({
      message: expect.stringContaining('zeebe:TaskDefinition'),
    });
    expect(withZeebe.configSource).toBe('.bpmnlintrc');
    expect(withZeebe.files[0].findings).not.toContainEqual(missingTaskDefinition);
    expect(withoutZeebe.files[0].findings).toContainEqual(missingTaskDefinition);
  });

  it('lets an explicit --preset win over the .bpmnlintrc', async () => {
    project
      .add('order.bpmn', GENERATED_IDS_MODEL)
      .write('.bpmnlintrc', JSON.stringify({ rules: {} }));

    expect((await project.json()).errorCount).toBe(0);
    expect((await project.json('--preset', 'strict')).configSource).toBe('preset strict');
  });

  it('lints only the listed files that match the globs, taking file names literally', async () => {
    project
      .add('models/sub dir/a [1].bpmn', GENERATED_IDS_MODEL)
      .add('models/untouched.bpmn', GENERATED_IDS_MODEL)
      .add('node_modules/dep/model.bpmn', GENERATED_IDS_MODEL)
      .write('changed.txt', 'models/sub dir/a [1].bpmn\nmodels/deleted.bpmn\nREADME.md\n');

    const listed = await project.json('--preset', 'strict', '--files-from', 'changed.txt');
    const all = await project.json('--preset', 'strict');

    expect(listed.files.map((file: { path: string }) => file.path)).toEqual([
      'models/sub dir/a [1].bpmn',
    ]);
    expect(all.files.map((file: { path: string }) => file.path)).toEqual([
      'models/sub dir/a [1].bpmn',
      'models/untouched.bpmn',
    ]);
  });

  it('shows paths relative to --path-base', async () => {
    project.add('app/models/order.bpmn', GENERATED_IDS_MODEL);

    const report = await project.json('--preset', 'strict', '--path-base', '..');

    expect(report.files[0].path).toBe(`${path.basename(project.dir)}/app/models/order.bpmn`);
  });

  it('reports a model that does not parse as an error', async () => {
    project.write('broken.bpmn', '<definitions');

    const report = await project.json('--preset', 'strict');

    expect(report.files[0].findings).toEqual([
      expect.objectContaining({ severity: 'error', rule: 'parse-error' }),
    ]);
  });

  it.each([
    [['--preset', 'nope'], /Unknown preset/],
    [['--config', 'missing.json'], /Cannot read config missing\.json/],
    [['--config', 'bad.json'], /config bad\.json is not valid JSON/],
    [['--config', 'unknown-plugin.json'], /unknown config <bpmnlint-plugin-nope\/recommended>/],
    [['--config', 'script-moddle.json'], /must be a JSON descriptor/],
  ])('exits 2 on a usage or config error: %j', async (argv, message) => {
    project
      .add('order.bpmn', CLEAN_MODEL)
      .write('bad.json', '{')
      .write('unknown-plugin.json', JSON.stringify({ extends: 'plugin:nope/recommended' }))
      .write('moddle.js', 'module.exports = {}')
      .write('script-moddle.json', JSON.stringify({ moddleExtensions: { evil: './moddle.js' } }));

    const result = await project.run(...argv);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(message);
  });
});
