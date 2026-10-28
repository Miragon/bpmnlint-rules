import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C7Host, type HostExtension } from '../../../lib/engine/c7-extensions/C7Host';
import { CamundaPlacement } from '../../../lib/engine/c7-extensions/CamundaPlacement';
import { EngineRule } from '../../../lib/engine/EngineRule';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter, ReportPath } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

const SERVICE_LIKE = ['bpmn:ServiceTask', 'bpmn:SendTask', 'bpmn:BusinessRuleTask'];
/** The form field types every engine knows (more only through a custom form type plugin). */
const FORM_TYPES = ['string', 'long', 'boolean', 'date', 'enum'];
/** The order in which the engines pick the definition a throw event with several acts on. */
const ACTING_ORDER: Record<string, string[]> = {
  'bpmn:IntermediateThrowEvent': ['Signal', 'Message'],
  'bpmn:EndEvent': ['Message', 'Signal'],
};

/**
 * Reports camunda extension content the Camunda 7 engines refuse to deploy: camunda:in / out
 * without source and target, an input or output parameter without name, a connector without
 * connectorId, a form field without id or with an unknown type, and a camunda:field without value
 * where the engines read the fields (class and delegate expression implementations and listeners,
 * shell tasks).
 */
class C7Extension extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): boolean | void {
    if (!C7Host.visits(node)) {
      return false;
    }
    const host = new C7Host(node);
    if (host.isDefinitions() || !C7Host.isExecutable(node)) {
      return;
    }
    for (const extension of new CamundaPlacement(host).readExtensions()) {
      this.checkContent(host, extension, reporter);
    }
    if (SERVICE_LIKE.some((type) => is(node, type))) {
      this.checkImplementationFields(host, node, host.describe(), reporter);
    }
    if (this.isActingMessageThrow(host)) {
      this.checkImplementationFields(host, node, describeElement(host.owner), reporter);
    }
  }

  private checkContent(host: C7Host, extension: HostExtension, reporter: Reporter): void {
    const { value, index, local } = extension;
    const where = host.describe();
    if (local === 'executionListener' || local === 'taskListener') {
      if (this.readsFields(value)) {
        const event: string | undefined = value.get('event');
        const label = `camunda:${local}${event ? ` (event ${event})` : ''} of ${where}`;
        this.checkFields(
          host,
          value.get('fields'),
          label,
          host.extensionPath(index, 'fields'),
          reporter,
        );
      }
    } else if (local === 'in' || local === 'out') {
      this.checkBinding(host, extension, reporter);
    } else if (local === 'inputOutput') {
      this.checkParameters(host, value, host.extensionPath(index), reporter);
    } else if (local === 'connector') {
      this.checkConnector(host, extension, reporter);
    } else if (local === 'formData') {
      this.checkFormFields(host, extension, reporter);
    }
  }

  private checkBinding(
    host: C7Host,
    { value, index, local }: HostExtension,
    reporter: Reporter,
  ): void {
    if (
      value.get('variables') !== undefined ||
      (local === 'in' && value.get('businessKey') !== undefined)
    ) {
      return;
    }
    const hasSource =
      value.get('source') !== undefined || value.get('sourceExpression') !== undefined;
    const hasTarget = value.get('target') !== undefined;
    if (hasSource && hasTarget) {
      return;
    }
    const missing = [!hasSource ? 'source or sourceExpression' : '', !hasTarget ? 'target' : '']
      .filter(Boolean)
      .join(' and ');
    host.report(reporter, {
      message: `camunda:${local} of ${host.describe()} has no ${missing} (and no variables="all"${local === 'in' ? ' / businessKey' : ''}); the engines refuse the file`,
      path: hasSource ? host.extensionPath(index, 'target') : host.extensionPath(index),
      type: ERROR_TYPES.PROPERTY_REQUIRED,
      node: value,
      requiredProperty: hasSource
        ? 'target'
        : ['source', 'sourceExpression', ...(hasTarget ? [] : ['target'])],
    });
  }

  private checkParameters(
    host: C7Host,
    mapping: ModdleElement,
    path: ReportPath,
    reporter: Reporter,
  ): void {
    for (const kind of ['inputParameter', 'outputParameter']) {
      const parameters: ModdleElement[] = mapping.get(`${kind}s`) ?? [];
      parameters.forEach((parameter, index) => {
        if (this.nonEmpty(parameter.get('name'))) {
          return;
        }
        host.report(reporter, {
          message: `camunda:${kind} ${index + 1} of ${host.describe()} has no name; the engines refuse the file`,
          path: [...path, `${kind}s`, index, 'name'],
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: parameter,
          requiredProperty: 'name',
        });
      });
    }
  }

  private checkConnector(host: C7Host, { value, index }: HostExtension, reporter: Reporter): void {
    if (value.get('connectorId') === undefined) {
      host.report(reporter, {
        message: `camunda:connector of ${host.describe()} has no camunda:connectorId; the engines refuse the file`,
        path: host.extensionPath(index, 'connectorId'),
        type: ERROR_TYPES.PROPERTY_REQUIRED,
        node: value,
        requiredProperty: 'connectorId',
      });
    }
    const mapping = value.get('inputOutput');
    if (mapping) {
      this.checkParameters(host, mapping, host.extensionPath(index, 'inputOutput'), reporter);
    }
  }

  private checkFormFields(host: C7Host, { value, index }: HostExtension, reporter: Reporter): void {
    const fields: ModdleElement[] = value.get('fields') ?? [];
    fields.forEach((field, fieldIndex) => {
      const id: string | undefined = field.get('id');
      const type: string | undefined = field.get('type');
      const label = `Form field ${id ?? fieldIndex + 1} of ${host.describe()}`;
      const path = host.extensionPath(index, 'fields', fieldIndex);
      if (!this.nonEmpty(id)) {
        host.report(reporter, {
          message: `${label} has no id; the engines refuse the file`,
          path: [...path, 'id'],
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: field,
          requiredProperty: 'id',
        });
      }
      if (type === undefined) {
        host.report(reporter, {
          message: `${label} has no type (one of ${FORM_TYPES.join(', ')}); the engines refuse the file`,
          path: [...path, 'type'],
          type: ERROR_TYPES.PROPERTY_REQUIRED,
          node: field,
          requiredProperty: 'type',
        });
      } else if (!FORM_TYPES.includes(type)) {
        host.report(reporter, {
          message: `${label} has type "${type}", which is not one of the built-in form types ${FORM_TYPES.join(', ')}; the engines refuse the file (unless a plugin registers it as a custom form type)`,
          path: [...path, 'type'],
          type: ERROR_TYPES.PROPERTY_VALUE_NOT_ALLOWED,
          node: field,
          property: 'type',
        });
      }
    });
  }

  /** The camunda:field elements of a task or a message throw event definition, where its implementation reads them. */
  private checkImplementationFields(
    host: C7Host,
    node: ModdleElement,
    label: string,
    reporter: Reporter,
  ): void {
    const type: string | undefined = node.get('camunda:type');
    const external = type?.toLowerCase() === 'external';
    const shell = type?.toLowerCase() === 'shell';
    if (type !== undefined && !external && !shell) {
      return;
    }
    const readsFields = type !== undefined ? shell : this.readsFields(node, 'camunda:');
    if (!readsFields) {
      return;
    }
    for (const { value, index } of host.camundaExtensions('field')) {
      this.checkFields(host, [value], label, host.extensionPath(index), reporter, false);
    }
  }

  /** Whether the engines parse the fields of an implementation: a class, or a delegate expression without an expression. */
  private readsFields(el: ModdleElement, prefix = ''): boolean {
    if (this.nonEmpty(el.get(`${prefix}class`))) {
      return true;
    }
    return (
      el.get(`${prefix}expression`) === undefined &&
      this.nonEmpty(el.get(`${prefix}delegateExpression`))
    );
  }

  private checkFields(
    host: C7Host,
    fields: ModdleElement[] | undefined,
    label: string,
    path: ReportPath,
    reporter: Reporter,
    indexed = true,
  ): void {
    (fields ?? []).forEach((field, index) => {
      const problem = this.fieldProblem(field);
      if (!problem) {
        return;
      }
      const name: string | undefined = field.get('name');
      const fieldPath = indexed ? [...path, index] : path;
      host.report(reporter, {
        message: `camunda:field${name !== undefined ? ` "${name}"` : ''} of ${label} has ${problem}; the engines refuse the file (a field needs stringValue, expression, a camunda:string or a camunda:expression)`,
        node: field,
        ...(problem === 'no value'
          ? {
              path: fieldPath,
              type: ERROR_TYPES.PROPERTY_REQUIRED,
              requiredProperty: ['stringValue', 'expression', 'string'],
            }
          : {
              path: [...fieldPath, 'string'],
              type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
              property: 'string',
            }),
      });
    });
  }

  /**
   * What keeps the engines from reading a field's value: none at all, or the stringValue attribute
   * next to a camunda:string element. An element without text counts as a value; an empty
   * expression does too, as the moddle cannot tell its attribute from its element.
   */
  private fieldProblem(field: ModdleElement): string | undefined {
    const stringValue: string | undefined = field.get('stringValue');
    const stringElement: string | undefined = field.get('string');
    if (stringValue !== undefined && stringElement !== undefined) {
      return 'both the attribute stringValue and a camunda:string element';
    }
    if (
      stringElement !== undefined ||
      this.nonEmptyLength(stringValue) ||
      field.get('expression') !== undefined
    ) {
      return undefined;
    }
    return 'no value';
  }

  /** Whether the host is the message definition a throw or end event acts on. */
  private isActingMessageThrow(host: C7Host): boolean {
    const event = host.owner;
    if (
      !is(host.node, 'bpmn:MessageEventDefinition') ||
      !event ||
      !(event.eventDefinitions ?? []).includes(host.node)
    ) {
      return false;
    }
    const order = ACTING_ORDER[event.$type];
    if (!order) {
      return false;
    }
    const definitions: ModdleElement[] = event.eventDefinitions;
    const ranks = definitions.map((definition) =>
      order.findIndex((kind) => is(definition, `bpmn:${kind}EventDefinition`)),
    );
    if (definitions.length < 2 || ranks.includes(-1)) {
      return true;
    }
    return definitions[ranks.indexOf(Math.min(...ranks))] === host.node;
  }

  private nonEmpty(text: unknown): boolean {
    return typeof text === 'string' && text.trim() !== '';
  }

  private nonEmptyLength(text: string | undefined): boolean {
    return text !== undefined && text.length > 0;
  }
}

export default defineRule(
  { ruleName: 'c7-extension', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7Extension,
);
