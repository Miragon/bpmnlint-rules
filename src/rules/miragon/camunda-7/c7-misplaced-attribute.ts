import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C7Host, CAMUNDA_URI } from '../../../lib/engine/c7-extensions/C7Host';
import { CamundaDescriptor } from '../../../lib/engine/c7-extensions/CamundaDescriptor';
import { CamundaPlacement } from '../../../lib/engine/c7-extensions/CamundaPlacement';
import { kindsText } from '../../../lib/engine/c7-extensions/utils/kindsText';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports a camunda attribute on an element the Camunda 7 engines do not read it on: an element
 * type it does not apply to (camunda:assignee on a service task, camunda:collection on the
 * activity instead of its loop), or the side of an event that ignores it (camunda:class on a
 * message catch event definition).
 */
class C7MisplacedAttribute extends EngineRule {
  protected readonly engine: Engine = 'c7';

  private readonly descriptor = CamundaDescriptor.get();

  protected checkElement(node: ModdleElement, reporter: Reporter): boolean | void {
    if (!C7Host.visits(node)) {
      return false;
    }
    const host = new C7Host(node);
    this.checkInapplicable(host, reporter);
    this.checkWrongSide(host, reporter);
  }

  private checkInapplicable(host: C7Host, reporter: Reporter): void {
    for (const { local, uri } of host.foreignAttributes()) {
      const owners = uri === CAMUNDA_URI ? this.descriptor.ownersOf(local) : undefined;
      if (!owners || this.descriptor.appliesTo(local, host.node)) {
        continue;
      }
      this.report(host, local, kindsText(owners), reporter);
    }
  }

  private checkWrongSide(host: C7Host, reporter: Reporter): void {
    const placement = new CamundaPlacement(host);
    for (const local of CamundaPlacement.sideAttributes()) {
      const side = placement.wrongSide(local, 'attributes');
      if (side && this.isSet(host.node, local)) {
        this.report(host, local, side, reporter);
      }
    }
  }

  /** Whether the file sets the typed camunda attribute `local` (its default does not count). */
  private isSet(node: ModdleElement, local: string): boolean {
    const property = node.$descriptor?.propertiesByName?.[`camunda:${local}`];
    return !!property && Object.prototype.hasOwnProperty.call(node, property.name);
  }

  private report(host: C7Host, local: string, readOn: string, reporter: Reporter): void {
    host.report(reporter, {
      message: `camunda:${local} on ${host.describe()} has no effect: the engines read it on ${readOn} only`,
      path: host.path(`camunda:${local}`),
      type: ERROR_TYPES.PROPERTY_NOT_ALLOWED,
      property: `camunda:${local}`,
    });
  }
}

export default defineRule(
  {
    ruleName: 'c7-misplaced-attribute',
    kind: 'engine-specific',
    targetEngine: 'c7',
    impact: 'runtime',
  },
  C7MisplacedAttribute,
);
