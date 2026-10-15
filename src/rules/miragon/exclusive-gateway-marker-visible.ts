import { inst } from '../../lib/di';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

/**
 * Reports an exclusive gateway drawn without its `X` marker (`isMarkerVisible` missing or false on
 * its `BPMNShape`).
 *
 * The attribute defaults to false, so a gateway written by a generator or another tool renders as
 * an empty diamond that a reader cannot tell apart from any other gateway type at a glance.
 */
export default function exclusiveGatewayMarkerVisible(): Rule {
  function check(node: ModdleElement, reporter: Reporter): void {
    if (node.$type !== 'bpmn:Definitions') {
      return;
    }

    for (const diagram of node.diagrams || []) {
      for (const planeElement of diagram.plane?.planeElement || []) {
        const el = planeElement.bpmnElement;

        if (
          planeElement.$type === 'bpmndi:BPMNShape' &&
          inst(el, 'bpmn:ExclusiveGateway') &&
          planeElement.isMarkerVisible !== true
        ) {
          reporter.report(
            el.id,
            'Exclusive gateway is drawn without its X marker — set isMarkerVisible="true"',
          );
        }
      }
    }
  }

  return { check };
}

exclusiveGatewayMarkerVisible.ruleName = 'exclusive-gateway-marker-visible' as const;
