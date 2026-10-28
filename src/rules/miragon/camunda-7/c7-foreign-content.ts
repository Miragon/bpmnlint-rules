import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C7Host, ZEEBE_URI } from '../../../lib/engine/c7-extensions/C7Host';
import { CamundaElementTree } from '../../../lib/engine/c7-extensions/CamundaElementTree';
import { CamundaPlacement } from '../../../lib/engine/c7-extensions/CamundaPlacement';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/** Reports Camunda 8 (zeebe) attributes and extension elements in a Camunda 7 diagram, which Camunda 7 ignores. */
class C7ForeignContent extends EngineRule {
  protected readonly engine: Engine = 'c7';

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
      if (uri !== ZEEBE_URI) {
        continue;
      }
      host.report(reporter, {
        message: `${host.describe()} carries the Camunda 8 attribute zeebe:${local}, which Camunda 7 ignores`,
        path: host.path(`zeebe:${local}`),
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        property: `zeebe:${local}`,
      });
    }
  }

  private checkExtensions(host: C7Host, reporter: Reporter): void {
    const placement = new CamundaPlacement(host);
    for (const extension of host.extensions()) {
      if (extension.uri === ZEEBE_URI) {
        host.report(reporter, {
          message: `${host.describe()} contains the Camunda 8 extension zeebe:${extension.local}, which Camunda 7 ignores`,
          path: host.extensionPath(extension.index),
          type: ERROR_TYPES.EXTENSION_ELEMENT_NOT_ALLOWED,
          node: extension.value,
          extensionElement: extension.value,
        });
        continue;
      }
      if (!extension.isCamunda || placement.misplacement(extension) !== undefined) {
        continue;
      }
      for (const { element, where, path } of new CamundaElementTree(host, extension).elements()) {
        this.checkNestedAttributes(host, element, where, path, reporter);
      }
    }
  }

  private checkNestedAttributes(
    host: C7Host,
    element: ModdleElement,
    where: string,
    path: (string | number)[],
    reporter: Reporter,
  ): void {
    for (const { local, uri } of C7Host.foreignAttributesOf(element)) {
      if (uri !== ZEEBE_URI) {
        continue;
      }
      host.report(reporter, {
        message: `${where} carries the Camunda 8 attribute zeebe:${local}, which Camunda 7 ignores`,
        path: [...path, `zeebe:${local}`],
        type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
        node: element,
        property: `zeebe:${local}`,
      });
    }
  }
}

export default defineRule(
  {
    ruleName: 'c7-foreign-content',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'runtime',
  },
  C7ForeignContent,
);
