import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { EngineRule } from '../../../lib/engine/EngineRule';
import { describeElement } from '../../../lib/engine/utils/describe';
import type { ModdleElement, Reporter, ReportPath } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

const SCHEMA_TYPE = /^(bpmn|bpmndi|dc|di):/;

const NESTED_PROPERTIES = ['eventDefinitions', 'loopCharacteristics', 'conditionExpression'];

/**
 * Reports an attribute without namespace prefix that the BPMN schema does not define, anywhere in
 * the file: Camunda 7 validates the whole file against the schema and refuses it.
 */
class C7Schema extends EngineRule {
  protected readonly engine: Engine = 'c7';

  protected checkElement(node: ModdleElement, reporter: Reporter): boolean | void {
    if (node.$descriptor?.isGeneric || !SCHEMA_TYPE.test(String(node.$type))) {
      return;
    }
    const keys = Object.keys(node.$attrs ?? {}).filter(
      (key) => !key.includes(':') && key !== 'xmlns',
    );
    if (keys.length) {
      this.reportKeys(node, reporter, keys);
    }
    if (is(node, 'bpmn:ExtensionElements')) {
      return false;
    }
  }

  private reportKeys(node: ModdleElement, reporter: Reporter, keys: string[]): void {
    const owner = this.ownerOf(node);
    const where =
      node === owner ? describeElement(node) : `${node.$type}${owner?.id ? ` in ${owner.id}` : ''}`;
    const path = owner ? this.pathBetween(owner, node) : [];
    for (const key of keys) {
      reportErrors(owner ?? node, reporter, {
        message: `${where} has the attribute ${key}, which the BPMN schema does not define; the engines validate the file against the schema and refuse it`,
        path: [...path, key],
        data: {
          type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
          node,
          parentNode: node === owner ? null : owner,
          property: key,
        },
      });
    }
  }

  /**
   * The element a finding is reported on: an event definition, loop or condition of an element
   * with an id is reported on that element, anything else on itself or its nearest ancestor with
   * an id.
   */
  private ownerOf(node: ModdleElement): ModdleElement | undefined {
    const parent = node.$parent;
    const nested =
      parent?.id &&
      NESTED_PROPERTIES.some((name) => this.childPath(parent, name, node) !== undefined);
    let owner = nested ? parent : node;
    while (owner && !owner.id) {
      owner = owner.$parent;
    }
    return owner;
  }

  /** The path from `ancestor` down to `node`, through the containment properties. */
  private pathBetween(ancestor: ModdleElement, node: ModdleElement): ReportPath {
    const path: ReportPath = [];
    for (let child = node; child !== ancestor && child.$parent; child = child.$parent) {
      const parent = child.$parent;
      const step = (parent.$descriptor?.properties ?? [])
        .map((property: { name: string }) => this.childPath(parent, property.name, child))
        .find(Boolean);
      path.unshift(...(step ?? []));
    }
    return path;
  }

  private childPath(
    parent: ModdleElement,
    name: string,
    child: ModdleElement,
  ): ReportPath | undefined {
    const value = parent[name];
    if (value === child) {
      return [name];
    }
    const index = Array.isArray(value) ? value.indexOf(child) : -1;
    return index === -1 ? undefined : [name, index];
  }
}

export default defineRule(
  { ruleName: 'c7-schema', kind: 'engine-specific', targetEngine: 'c7', impact: 'deploy' },
  C7Schema,
);
