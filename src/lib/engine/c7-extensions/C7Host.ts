import { is } from 'bpmnlint-utils';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { ModdleElement, Reporter, ReportPath } from '../../moddle';
import { DiagramNamespaces } from '../DiagramNamespaces';
import { describeElement } from '../utils/describe';

export const CAMUNDA_URI = 'http://camunda.org/schema/1.0/bpmn';
export const ZEEBE_URI = 'http://camunda.org/schema/zeebe/1.0';

/** A prefixed attribute the moddle left in `$attrs`, with the namespace its prefix stands for. */
interface ForeignAttribute {
  key: string;
  local: string;
  uri: string | undefined;
}

/** One entry of a host's extension elements: a typed camunda element, or a generic one of another namespace. */
export interface HostExtension {
  value: ModdleElement;
  index: number;
  /** `inputOutput`, `taskListener`, `taskDefinition` */
  local: string;
  uri: string | undefined;
  isCamunda: boolean;
}

/** One problem a host reports, in camunda-compat's shape; `path` continues the host's own path. */
interface HostReport {
  message: string;
  path: ReportPath;
  type: string;
  /** The element that holds the property, when it is not the host. */
  node?: ModdleElement;
  [key: string]: unknown;
}

/**
 * A BPMN element as the Camunda 7 checks see it: whether they look at it at all, the element its
 * findings land on (an event definition, loop or condition on its flow node or flow, anything
 * without an id on the nearest element with one), how messages name it, and its camunda content.
 */
export class C7Host {
  /** The nearest enclosing element with an id, below `bpmn:Definitions`. */
  readonly owner: ModdleElement | undefined;
  /** The element a finding about this host is reported on. */
  private readonly target: ModdleElement;
  private readonly prefix: ReportPath;

  constructor(readonly node: ModdleElement) {
    this.owner = C7Host.nearestWithId(node.$parent);
    this.target = this.isNestedPartOfOwner() ? this.owner : node.id ? node : (this.owner ?? node);
    this.prefix = C7Host.pathBetween(this.target, node);
  }

  /**
   * Whether the checks look at `node`: BPMN elements outside vendor content and DI, except an
   * ad-hoc sub-process of an executable process with everything inside it (the engines skip it).
   */
  static visits(node: ModdleElement): boolean {
    if (!String(node.$type).startsWith('bpmn:') || is(node, 'bpmn:ExtensionElements')) {
      return false;
    }
    return !(is(node, 'bpmn:AdHocSubProcess') && C7Host.isExecutable(node));
  }

  /** Whether `node` lies in a process with `isExecutable="true"`. */
  static isExecutable(node: ModdleElement): boolean {
    let current = node;
    while (current && !is(current, 'bpmn:Process')) {
      current = current.$parent;
    }
    return current?.isExecutable === true;
  }

  /** `serviceTask Activity_1`, `the multiInstanceLoopCharacteristics of userTask Activity_1` */
  describe(): string {
    return describeElement(this.node, this.owner);
  }

  isDefinitions(): boolean {
    return is(this.node, 'bpmn:Definitions');
  }

  /** The prefixed attributes the moddle did not type, in file order. */
  foreignAttributes(): ForeignAttribute[] {
    return C7Host.foreignAttributesOf(this.node).filter(({ key }) => key.includes(':'));
  }

  /** The attributes of any element the moddle did not type, with their namespace when prefixed. */
  static foreignAttributesOf(el: ModdleElement): ForeignAttribute[] {
    const namespaces = DiagramNamespaces.forElement(el);
    return Object.keys(el.$attrs ?? {})
      .filter((key) => !key.startsWith('xmlns'))
      .map((key) => ({
        key,
        local: key.slice(key.indexOf(':') + 1),
        uri: namespaces.uriOf(key),
      }));
  }

  extensions(): HostExtension[] {
    const values: ModdleElement[] = this.node.extensionElements?.values ?? [];
    const namespaces = DiagramNamespaces.forElement(this.node);
    return values.map((value, index) => {
      const isCamunda = !value.$descriptor?.isGeneric && String(value.$type).startsWith('camunda:');
      const typeName = String(value.$type).slice(String(value.$type).indexOf(':') + 1);
      return {
        value,
        index,
        local: typeName.charAt(0).toLowerCase() + typeName.slice(1),
        uri: isCamunda ? CAMUNDA_URI : namespaces.uriOf(String(value.$type)),
        isCamunda,
      };
    });
  }

  camundaExtensions(local?: string): HostExtension[] {
    return this.extensions().filter(
      (extension) => extension.isCamunda && (local === undefined || extension.local === local),
    );
  }

  /** The path from the reported element to a property of this host. */
  path(...steps: ReportPath): ReportPath {
    return [...this.prefix, ...steps];
  }

  /** The path from the reported element to a property of the extension element at `index`. */
  extensionPath(index: number, ...steps: ReportPath): ReportPath {
    return this.path('extensionElements', 'values', index, ...steps);
  }

  report(reporter: Reporter, { message, path, type, node, ...details }: HostReport): void {
    const holder = node ?? this.node;
    reportErrors(this.target, reporter, {
      message,
      path,
      data: {
        type,
        node: holder,
        parentNode: holder === this.target ? null : this.target,
        ...details,
      },
    });
  }

  /** The path from `ancestor` down to `el` through the properties that contain each step. */
  private static pathBetween(ancestor: ModdleElement, el: ModdleElement): ReportPath {
    const steps: ReportPath = [];
    let child = el;
    while (child && child !== ancestor && child.$parent) {
      const parent = child.$parent;
      steps.unshift(...C7Host.stepInto(parent, child));
      child = parent;
    }
    return steps;
  }

  private static stepInto(parent: ModdleElement, child: ModdleElement): ReportPath {
    for (const property of parent.$descriptor?.properties ?? []) {
      const value = parent.get(property.name);
      if (value === child) {
        return [property.ns?.localName ?? property.name];
      }
      if (Array.isArray(value) && value.includes(child)) {
        return [property.ns?.localName ?? property.name, value.indexOf(child)];
      }
    }
    return [];
  }

  private static nearestWithId(start: ModdleElement): ModdleElement | undefined {
    let current = start;
    while (current && !is(current, 'bpmn:Definitions')) {
      if (current.id) {
        return current;
      }
      current = current.$parent;
    }
    return undefined;
  }

  private isNestedPartOfOwner(): boolean {
    const owner = this.owner;
    if (!owner || owner === this.node) {
      return false;
    }
    return (
      (owner.eventDefinitions ?? []).includes(this.node) ||
      owner.loopCharacteristics === this.node ||
      owner.conditionExpression === this.node
    );
  }
}
