import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import { C7ExecutableRule } from '../../../lib/engine/c7-implementation/C7ExecutableRule';
import { ImplementationHost } from '../../../lib/engine/c7-implementation/ImplementationHost';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

const SHELL_FLAGS = ['wait', 'redirectError', 'cleanEnv'];
const IMPLEMENTATIONS = ['class', 'delegateExpression', 'expression', 'type'];

/**
 * Reports a task, or a message throw or end event, whose implementation Camunda 7 refuses to deploy:
 * none at all, an unsupported `camunda:type`, or a shell task with a missing or unusable field.
 */
class C7Implementation extends C7ExecutableRule {
  protected checkExecutable(node: ModdleElement, reporter: Reporter): void {
    for (const host of ImplementationHost.forElement(node)) {
      this.checkHost(host, reporter);
    }
  }

  private checkHost(host: ImplementationHost, reporter: Reporter): void {
    if (host.hasUnsupportedType) {
      this.reportUnsupportedType(host, reporter);
      return;
    }
    if (host.isShell) {
      this.checkShell(host, reporter);
    }
    if (!host.hasImplementation && !host.isEvent) {
      this.reportMissing(host, reporter);
    }
  }

  private reportUnsupportedType(host: ImplementationHost, reporter: Reporter): void {
    const type = host.type!;
    const mail =
      type.toLowerCase() === 'mail'
        ? ' (the standard engine distributions cannot load the mail task)'
        : '';
    reportErrors(host.reported, reporter, {
      message: `camunda:type="${type}" on ${host.label} is not supported (only "external" and "shell")${mail}; the engines refuse the file`,
      path: host.pathTo('type'),
      data: {
        type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
        node: host.element,
        parentNode: host.parentNode,
        property: 'type',
      },
    });
  }

  private reportMissing(host: ImplementationHost, reporter: Reporter): void {
    const decision = host.readsDecisionRef ? ', decisionRef' : '';
    reportErrors(host.reported, reporter, {
      message: `${host.label} has no implementation (camunda:class, delegateExpression, expression, type=external${decision} or a connector); the engines refuse the file`,
      path: host.pathTo('type'),
      data: {
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: host.element,
        parentNode: host.parentNode,
        requiredProperty: host.readsDecisionRef
          ? [...IMPLEMENTATIONS, 'decisionRef']
          : IMPLEMENTATIONS,
      },
    });
  }

  private checkShell(host: ImplementationHost, reporter: Reporter): void {
    const fields = host.fields();
    if (!fields.some(({ field }) => field.get('name') === 'command')) {
      reportErrors(host.reported, reporter, {
        message: `${host.label} is a shell task without a camunda:field named command; the engines refuse the file`,
        path: host.pathTo('extensionElements'),
        data: {
          type: ERROR_TYPES.EXTENSION_ELEMENT_REQUIRED,
          node: host.element,
          parentNode: host.parentNode,
          requiredExtensionElement: 'camunda:Field',
        },
      });
    }
    for (const { field, index } of fields) {
      this.checkShellField(host, field, index, reporter);
    }
  }

  /** A field with no value, or with both a string attribute and element, is left to c7-extension. */
  private checkShellField(
    host: ImplementationHost,
    field: ModdleElement,
    index: number,
    reporter: Reporter,
  ): void {
    const name = field.get('name') ?? '';
    const fieldPath = host.pathTo('extensionElements', 'values', index);
    const stringValue: string | undefined = field.get('stringValue');
    const string: string | undefined = field.get('string');
    if (stringValue !== undefined && string !== undefined) {
      return;
    }
    const fixed = string ?? (stringValue ? stringValue : undefined);
    if (fixed !== undefined) {
      if (SHELL_FLAGS.includes(name) && !['true', 'false'].includes(fixed.toLowerCase())) {
        reportErrors(host.reported, reporter, {
          message: `camunda:field "${name}" of shell task ${host.label} is "${fixed}", not true or false; the engines refuse the file`,
          path: [...fieldPath, string !== undefined ? 'string' : 'stringValue'],
          data: {
            type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
            node: field,
            parentNode: host.reported,
            property: string !== undefined ? 'string' : 'stringValue',
          },
        });
      }
      return;
    }
    if (field.get('expression') !== undefined) {
      reportErrors(host.reported, reporter, {
        message: `camunda:field "${name}" of shell task ${host.label} is an expression; the shell task takes fixed values only and the engines refuse the file`,
        path: [...fieldPath, 'expression'],
        data: {
          type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
          node: field,
          parentNode: host.reported,
          property: 'expression',
        },
      });
    }
  }
}

export default defineRule(
  { ruleName: 'c7-implementation', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7Implementation,
);
