'use strict';

/**
 * Distro smoke test — does the *published* package actually work, both ways?
 *
 * Unit tests run through Vite against `src/`. This packs a real tarball, installs it into a
 * throwaway consumer next to `bpmnlint`, and checks the two consumer paths end to end:
 *
 *   1. Classic `.bpmnlintrc` + `bpmnlint` CLI — `plugin:@miragon/rules/all` resolves, a known-bad
 *      model trips a Miragon rule, a clean model stays silent. This is the path that a missing
 *      `files` entry, a non-bare rule export, or a wrong config name would silently break.
 *   2. Programmatic — the bundled resolver resolves rules from every layer and the per-engine
 *      config is shaped right.
 *
 * Run: `npm run test:distro` (after `npm run build`).
 */

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { name, devDependencies } = require(path.join(REPO_ROOT, 'package.json'));
const BPMNLINT_VERSION = devDependencies.bpmnlint;

const npm = (args, cwd) =>
  execFileSync('npm', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

const step = (message) => console.log(`  -> ${message}`);

/** Runs the installed bpmnlint CLI over a fixture and returns its combined output + status. */
function lint(project, fixture) {
  try {
    const output = execFileSync(path.join(project, 'node_modules', '.bin', 'bpmnlint'), [fixture], {
      cwd: project,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output };
  } catch (error) {
    return { status: error.status, output: `${error.stdout || ''}${error.stderr || ''}` };
  }
}

function main() {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'bpmnlint-rules-distro-'));
  const project = path.join(sandbox, 'consumer');

  try {
    step(`sandbox: ${sandbox}`);

    const { filename } = JSON.parse(
      npm(['pack', '--json', '--pack-destination', sandbox], REPO_ROOT),
    )[0];
    const tarball = path.join(sandbox, filename);
    step(`packed ${filename}`);

    fs.mkdirSync(project);
    fs.writeFileSync(
      path.join(project, 'package.json'),
      JSON.stringify({ name: 'consumer', version: '1.0.0', private: true }, null, 2),
    );
    fs.writeFileSync(
      path.join(project, '.bpmnlintrc'),
      JSON.stringify({ extends: ['bpmnlint:recommended', 'plugin:@miragon/rules/all'] }, null, 2),
    );
    npm(['install', '--no-audit', '--no-fund', tarball, `bpmnlint@${BPMNLINT_VERSION}`], project);
    step('installed the tarball next to bpmnlint');

    // (1) Classic path: a known-bad model trips a Miragon rule via the CLI.
    const badFixture = path.join(project, 'bad.bpmn');
    fs.copyFileSync(
      path.join(REPO_ROOT, 'test/fixtures/rules/no-generated-ids/invalid.bpmn'),
      badFixture,
    );
    const bad = lint(project, badFixture);
    assert.notEqual(bad.status, 0, `a bad model should fail the lint, got:\n${bad.output}`);
    assert.match(bad.output, /no-generated-ids/, `expected the rule in output:\n${bad.output}`);
    step('classic path: known-bad model tripped @miragon/rules/no-generated-ids');

    // And a clean model stays silent.
    const goodFixture = path.join(project, 'good.bpmn');
    fs.copyFileSync(path.join(REPO_ROOT, 'test/fixtures/valid/membership.bpmn'), goodFixture);
    const good = lint(project, goodFixture);
    assert.equal(good.status, 0, `a clean model should pass, got:\n${good.output}`);
    step('classic path: clean model reported nothing');

    // (2) Programmatic path: the bundled resolver + per-engine config, from the installed package.
    const dist = require(path.join(project, 'node_modules', name));
    const resolver = dist.createBundledResolver();
    for (const [pkg, rule] of [
      ['bpmnlint', 'label-required'],
      ['@miragon/bpmnlint-plugin-rules', 'no-generated-ids'],
      ['bpmnlint-plugin-camunda-compat', 'feel'],
    ]) {
      assert.equal(
        typeof resolver.resolveRule(pkg, rule),
        'function',
        `resolveRule(${pkg}/${rule})`,
      );
    }
    const c8 = dist.getDefaultLintConfig({ engine: 'c8' });
    assert.ok(
      Array.isArray(c8.extends) && c8.extends.includes('plugin:camunda-compat/camunda-cloud-8-10'),
      'c8 config must extend the Camunda 8 layer',
    );
    step('programmatic path: bundled resolver + c8 config OK');

    console.log('distro smoke OK');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

main();
