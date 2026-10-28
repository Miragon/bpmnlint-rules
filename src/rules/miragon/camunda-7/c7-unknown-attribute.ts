import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C7Host, CAMUNDA_URI } from '../../../lib/engine/c7-extensions/C7Host';
import { CamundaDescriptor } from '../../../lib/engine/c7-extensions/CamundaDescriptor';
import { CamundaElementTree } from '../../../lib/engine/c7-extensions/CamundaElementTree';
import { CamundaPlacement } from '../../../lib/engine/c7-extensions/CamundaPlacement';
import { didYouMean } from '../../../lib/engine/c7-extensions/utils/didYouMean';
import { kindsText } from '../../../lib/engine/c7-extensions/utils/kindsText';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter, ReportPath } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/** Attributes the engines read that the descriptor knows as child elements only. */
const EXTRA_ATTRIBUTES: Record<string, string[]> = { 'camunda:Field': ['expression'] };

/**
 * Reports camunda attributes the descriptor does not know (a typo such as camunda:asignee), on a
 * BPMN element or on a camunda extension element; the Camunda 7 engines ignore them.
 */
class C7UnknownAttribute extends EngineRule {
  protected readonly engine: Engine = 'c7';

  private readonly descriptor = CamundaDescriptor.get();

  protected checkElement(node: ModdleElement, reporter: Reporter): boolean | void {
    if (!C7Host.visits(node)) {
      return false;
    }
    const host = new C7Host(node);
    this.checkAttributes(host, reporter);
    if (!host.isDefinitions()) {
      this.checkExtensions(host, reporter);
    }
  }

  private checkAttributes(host: C7Host, reporter: Reporter): void {
    for (const { local, uri } of host.foreignAttributes()) {
      if (uri !== CAMUNDA_URI || this.descriptor.ownersOf(local)) {
        continue;
      }
      host.report(reporter, {
        message: `${host.describe()} has the unknown attribute camunda:${local}${this.suggestion(host, local)}; the engines ignore it`,
        path: host.path(`camunda:${local}`),
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        property: `camunda:${local}`,
      });
    }
  }

  /** ` (did you mean camunda:assignee?)`, preferring the attributes that apply to the host. */
  private suggestion(host: C7Host, local: string): string {
    const applicable = this.descriptor.attributeNamesFor(host.node);
    const guess = didYouMean(local, this.descriptor.attributeNames(), applicable);
    if (!guess) {
      return '';
    }
    const elsewhere = applicable.includes(guess)
      ? ''
      : ` It applies to ${kindsText(this.descriptor.ownersOf(guess) ?? [])} only.`;
    return ` (did you mean camunda:${guess}?${elsewhere})`;
  }

  private checkExtensions(host: C7Host, reporter: Reporter): void {
    const placement = new CamundaPlacement(host);
    for (const extension of placement.readExtensions()) {
      for (const { element, where, path } of new CamundaElementTree(host, extension).elements()) {
        this.checkNestedAttributes(host, element, where, path, reporter);
      }
    }
  }

  private checkNestedAttributes(
    host: C7Host,
    element: ModdleElement,
    where: string,
    path: ReportPath,
    reporter: Reporter,
  ): void {
    for (const { key } of C7Host.foreignAttributesOf(element)) {
      if (key.includes(':')) {
        continue;
      }
      const guess = didYouMean(key, this.attributeNamesOf(element));
      host.report(reporter, {
        message: `${where} has the unknown attribute ${key}${guess ? ` (did you mean ${guess}?)` : ''}; the engines ignore it`,
        path: [...path, key],
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: element,
        property: key,
      });
    }
  }

  private attributeNamesOf(element: ModdleElement): string[] {
    const names: string[] = (element.$descriptor?.properties ?? [])
      .filter((property: any) => property.isAttr || (property.isReference && !property.isMany))
      .map((property: any) => property.ns?.localName ?? property.name);
    return [...new Set([...names, ...(EXTRA_ATTRIBUTES[element.$type] ?? [])])];
  }
}

export default defineRule(
  {
    ruleName: 'c7-unknown-attribute',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'runtime',
  },
  C7UnknownAttribute,
);
