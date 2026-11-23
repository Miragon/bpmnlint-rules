import { describe, expect, it } from 'vitest';

import { GithubAnnotationFormatter } from '../../../src/cli/report/GithubAnnotationFormatter';
import { JsonFormatter } from '../../../src/cli/report/JsonFormatter';
import { LintReport } from '../../../src/cli/report/LintReport';
import { MarkdownFormatter } from '../../../src/cli/report/MarkdownFormatter';
import { TextFormatter } from '../../../src/cli/report/TextFormatter';

const mixedReport = new LintReport('.bpmnlintrc', [
  {
    path: 'processes/order.bpmn',
    findings: [
      {
        severity: 'error',
        rule: '@miragon/rules/exclusive-gateway-marker-visible',
        elementId: 'gateway_isValid',
        line: 12,
        message: 'Gateway has no visible marker',
      },
      {
        severity: 'warn',
        rule: 'label-required',
        elementId: 'task_ship',
        message: 'Missing label',
      },
    ],
  },
  { path: 'processes/clean.bpmn', findings: [] },
]);

describe('LintReport', () => {
  it('counts findings per severity and serialises the versioned JSON contract', () => {
    expect([mixedReport.errorCount, mixedReport.warningCount, mixedReport.infoCount]).toEqual([
      1, 1, 0,
    ]);
    expect(JSON.parse(new JsonFormatter().format(mixedReport))).toMatchObject({
      schemaVersion: 1,
      configSource: '.bpmnlintrc',
      errorCount: 1,
      warningCount: 1,
      files: [{ path: 'processes/order.bpmn' }, { path: 'processes/clean.bpmn', findings: [] }],
    });
  });
});

describe('MarkdownFormatter', () => {
  it('renders a headline with the counts and one table per file with findings', () => {
    const markdown = new MarkdownFormatter().format(mixedReport);

    expect(markdown).toContain('### 🔴 BPMN lint: 1 error, 1 warning');
    expect(markdown).toContain('Config `.bpmnlintrc` · 2 files linted, 1 with findings');
    expect(markdown).toContain(
      '| 🔴 error | `gateway_isValid` | [`exclusive-gateway-marker-visible`](https://miragon.github.io/bpmnlint-rules/rules/exclusive-gateway-marker-visible) | Gateway has no visible marker |',
    );
    expect(markdown).toContain('| 🟡 warn | `task_ship` | `label-required` | Missing label |');
    expect(markdown).not.toContain('clean.bpmn');
  });

  it('says so when nothing was found or nothing was linted', () => {
    const clean = new LintReport('preset strict', [{ path: 'a.bpmn', findings: [] }]);

    expect(new MarkdownFormatter().format(clean)).toContain('### ✅ BPMN lint: no findings');
    expect(new MarkdownFormatter().format(new LintReport('preset strict', []))).toContain(
      '### ✅ BPMN lint: no BPMN files to lint',
    );
  });

  it('escapes markup, HTML and mentions that come from the model', () => {
    const hostile = new LintReport('.bpmnlintrc', [
      {
        path: 'evil_<b>.bpmn',
        findings: [
          {
            severity: 'error',
            rule: 'x',
            elementId: 'id`with|pipe',
            message: 'hi @octocat ![img](https://t.co/p.png) </details>\nnext | cell',
          },
        ],
      },
    ]);

    const markdown = new MarkdownFormatter().format(hostile);

    expect(markdown).toContain('**evil\\_&lt;b&gt;.bpmn**');
    expect(markdown).toContain('`` id`with\\|pipe ``');
    expect(markdown).toContain(
      'hi @&#8203;octocat \\!\\[img\\](https://t.co/p.png) &lt;/details&gt; next \\| cell',
    );
  });

  it('leaves out the file tables that do not fit the size limit and says how many findings are missing', () => {
    const files = [...Array(20).keys()].map((index) => ({
      path: `model-${index}.bpmn`,
      findings: [{ severity: 'warn' as const, rule: 'r', message: 'x'.repeat(100) }],
    }));

    const markdown = new MarkdownFormatter(1000).format(new LintReport('.bpmnlintrc', files));

    expect(markdown.length).toBeLessThanOrEqual(1000);
    expect(markdown).toContain('model-0.bpmn');
    expect(markdown).not.toContain('model-19.bpmn');
    expect(markdown).toMatch(/_\d+ more findings not shown \(size limit\)/);
  });
});

describe('GithubAnnotationFormatter', () => {
  it('emits one workflow command per finding, at the element line when known', () => {
    expect(new GithubAnnotationFormatter().format(mixedReport)).toBe(
      '::error file=processes/order.bpmn,line=12,title=@miragon/rules/exclusive-gateway-marker-visible::gateway_isValid: Gateway has no visible marker\n' +
        '::warning file=processes/order.bpmn,title=label-required::task_ship: Missing label\n',
    );
  });

  it('cannot be tricked into issuing another workflow command', () => {
    const hostile = new LintReport('.bpmnlintrc', [
      {
        path: 'a,b:c.bpmn',
        findings: [{ severity: 'info', rule: 'r', message: 'x\n::stop-commands::token 100%' }],
      },
    ]);

    expect(new GithubAnnotationFormatter().format(hostile)).toBe(
      '::notice file=a%2Cb%3Ac.bpmn,title=r::x%0A::stop-commands::token 100%25\n',
    );
  });
});

describe('TextFormatter', () => {
  it('prints one line per finding and a summary', () => {
    expect(new TextFormatter().format(mixedReport)).toBe(
      'processes/order.bpmn\n' +
        '  gateway_isValid:12  error  Gateway has no visible marker  @miragon/rules/exclusive-gateway-marker-visible\n' +
        '  task_ship  warn  Missing label  label-required\n' +
        '\n' +
        '2 findings in 2 files (1 error, 1 warning, 0 infos).\n',
    );
  });
});
