import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C8CheckedElement } from '../../../lib/engine/c8-extensions/C8CheckedElement';
import { closestName } from '../../../lib/engine/c8-extensions/utils/closestName';
import { ZeebeSchema } from '../../../lib/engine/c8-extensions/ZeebeSchema';
import { EngineRule } from '../../../lib/engine/EngineRule';
import type { ModdleElement, Reporter, ReportPath } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/**
 * Reports an attribute Camunda 8 does not know: a `zeebe:` attribute of a BPMN element the zeebe
 * descriptor does not define (most zeebe settings are extension elements), or an attribute a zeebe
 * extension element does not have. Camunda 8 ignores it.
 */
class C8UnknownAttribute extends EngineRule {
  protected readonly engine: Engine = 'c8';

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    const checked = C8CheckedElement.forNode(node);
    if (!checked) {
      return;
    }

    this.checkBpmnAttributes(checked, reporter);
    for (const { value, index, placement } of checked.zeebeValues()) {
      if (placement === 'read') {
        this.checkZeebeElement(checked, value, checked.extensionPath(index), [], reporter);
      }
    }
  }

  private checkBpmnAttributes(checked: C8CheckedElement, reporter: Reporter): void {
    const schema = ZeebeSchema.instance;
    for (const key of checked.zeebeAttributeKeys()) {
      const localName = key.slice(key.indexOf(':') + 1);
      if (schema.ownersOfHostAttribute(localName)) {
        continue;
      }
      const home = schema.homeOfAttribute(localName, checked.el);
      const guess = home ? undefined : closestName(localName, schema.hostAttributeNames());
      const where = home
        ? ` (it reads ${localName} on the ${home.name} extension element)`
        : ' (most zeebe settings are extension elements)';
      checked.report(
        reporter,
        `${checked.describe()} has the unknown attribute zeebe:${localName}${guess ? ` (did you mean zeebe:${guess}?)` : ''}; Camunda 8 ignores it${where}`,
        checked.path(key),
        { type: ERROR_TYPES.PROPERTY_NOT_ALLOWED, node: checked.el, property: key },
      );
    }
  }

  private checkZeebeElement(
    checked: C8CheckedElement,
    element: ModdleElement,
    path: ReportPath,
    containers: string[],
    reporter: Reporter,
  ): void {
    const type = ZeebeSchema.instance.typeOf(element);
    if (!type) {
      return;
    }
    const where = `${type.name}${containers.length ? ` (in ${containers.join(' > ')})` : ''} of ${checked.describe()}`;
    for (const key of Object.keys(element.$attrs ?? {})) {
      if (key.includes(':') || key.startsWith('xmlns')) {
        continue;
      }
      const guess = closestName(key, type.attributes);
      checked.report(
        reporter,
        `${where} has the unknown attribute ${key}${guess ? ` (did you mean ${guess}?)` : ''}; Camunda 8 ignores it`,
        [...path, key],
        { type: ERROR_TYPES.PROPERTY_NOT_ALLOWED, node: element, property: key },
      );
    }
    for (const property of element.$descriptor?.properties ?? []) {
      if (property.isAttr) {
        continue;
      }
      const content = element.get(property.name);
      const children: ModdleElement[] = Array.isArray(content) ? content : [content];
      children.forEach((child, childIndex) => {
        const childPath = Array.isArray(content)
          ? [...path, property.name, childIndex]
          : [...path, property.name];
        this.checkZeebeElement(checked, child, childPath, [...containers, type.name], reporter);
      });
    }
  }
}

export default defineRule(
  {
    ruleName: 'c8-unknown-attribute',
    kind: 'engine-specific',
    targetEngine: 'c8',
    impact: 'runtime',
  },
  C8UnknownAttribute,
);
