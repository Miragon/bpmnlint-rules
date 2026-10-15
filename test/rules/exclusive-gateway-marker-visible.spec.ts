import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/exclusive-gateway-marker-visible';
import { model } from '../support/model';

const MESSAGE = 'Exclusive gateway is drawn without its X marker — set isMarkerVisible="true"';

verify('exclusive-gateway-marker-visible', rule, {
  valid: [
    {
      name: 'an exclusive gateway with a visible marker',
      moddleElement: model({
        shapes: [{ id: 'gateway_approved', tag: 'exclusiveGateway', isMarkerVisible: true }],
      }),
    },
    {
      name: 'other gateway types never carry the attribute',
      moddleElement: model({
        shapes: [
          { id: 'gateway_split', tag: 'parallelGateway' },
          { id: 'gateway_any', tag: 'inclusiveGateway' },
          { id: 'gateway_event', tag: 'eventBasedGateway' },
        ],
      }),
    },
  ],
  invalid: [
    {
      name: 'an exclusive gateway without the attribute',
      moddleElement: model({ shapes: [{ id: 'gateway_approved', tag: 'exclusiveGateway' }] }),
      report: { id: 'gateway_approved', message: MESSAGE },
    },
    {
      name: 'an exclusive gateway with the marker explicitly hidden',
      moddleElement: model({
        shapes: [{ id: 'gateway_approved', tag: 'exclusiveGateway', isMarkerVisible: false }],
      }),
      report: { id: 'gateway_approved', message: MESSAGE },
    },
  ],
});
