import { is, isAny } from 'bpmnlint-utils';

import type { ModdleElement, ReportPath } from '../../moddle';
import { describeElement } from '../utils/describe';
import { ActedEventDefinitions } from './ActedEventDefinitions';
import { CamundaAttributes } from './CamundaAttributes';
import { nonEmpty } from './utils/values';

const SERVICE_LIKE = ['bpmn:ServiceTask', 'bpmn:SendTask', 'bpmn:BusinessRuleTask'];
const THROW_EVENTS = ['bpmn:IntermediateThrowEvent', 'bpmn:EndEvent'];

/**
 * Where Camunda 7 reads how work is implemented: a service, send or business rule task, or the
 * message definition of a message throw or end event. Reports go on the task or the event; `path`
 * leads from there to the host.
 */
export class ImplementationHost {
  readonly attributes: CamundaAttributes;

  private constructor(
    /** The task, or the event of a message definition. */
    readonly reported: ModdleElement,
    /** The task, or the message definition. */
    readonly element: ModdleElement,
    readonly path: ReportPath,
  ) {
    this.attributes = new CamundaAttributes(element);
  }

  /** The implementation hosts of `node`: none, the task itself, or its read message definitions. */
  static forElement(node: ModdleElement): ImplementationHost[] {
    if (isAny(node, SERVICE_LIKE)) {
      return [new ImplementationHost(node, node, [])];
    }
    if (!isAny(node, THROW_EVENTS)) {
      return [];
    }
    return new ActedEventDefinitions(node)
      .ofType('bpmn:MessageEventDefinition')
      .map(
        ({ definition, index }) =>
          new ImplementationHost(node, definition, ['eventDefinitions', index]),
      );
  }

  /** `serviceTask X`, or `endEvent X` for a message definition. */
  get label(): string {
    return describeElement(this.reported);
  }

  get isEvent(): boolean {
    return this.reported !== this.element;
  }

  /** The `parentNode` of a report on the host: the event of a message definition. */
  get parentNode(): ModdleElement | null {
    return this.isEvent ? this.reported : null;
  }

  get readsDecisionRef(): boolean {
    return is(this.element, 'bpmn:BusinessRuleTask');
  }

  get type(): string | undefined {
    return this.attributes.defined('type');
  }

  get isExternal(): boolean {
    return this.type?.toLowerCase() === 'external';
  }

  get isShell(): boolean {
    return this.type?.toLowerCase() === 'shell';
  }

  /** A `camunda:type` the engines do not run: neither external nor shell. */
  get hasUnsupportedType(): boolean {
    return this.type !== undefined && !this.isExternal && !this.isShell;
  }

  /** Whether the engines find an implementation: a delegate, an external or shell task, a connector or a decision. */
  get hasImplementation(): boolean {
    return (
      ['class', 'delegateExpression', 'expression'].some((local) =>
        nonEmpty(this.attributes.defined(local)),
      ) ||
      this.isExternal ||
      this.isShell ||
      this.hasConnector() ||
      (this.readsDecisionRef && this.attributes.defined('decisionRef') !== undefined)
    );
  }

  /** The path from the reported element to `property` of the host. */
  pathTo(...property: ReportPath): ReportPath {
    return [...this.path, ...property];
  }

  /** The `camunda:Field` extension elements of the host, with their index in `values`. */
  fields(): Array<{ field: ModdleElement; index: number }> {
    return this.extensionValues(this.element)
      .map((field, index) => ({ field, index }))
      .filter(({ field }) => is(field, 'camunda:Field'));
  }

  private hasConnector(): boolean {
    const hosts = this.isEvent ? [this.element, this.reported] : [this.element];
    return hosts.some((host) =>
      this.extensionValues(host).some((value) => is(value, 'camunda:Connector')),
    );
  }

  private extensionValues(host: ModdleElement): ModdleElement[] {
    return host.get('extensionElements')?.get('values') ?? [];
  }
}
