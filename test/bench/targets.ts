import type { MiragonRuleName } from '../../src/rules/miragon';

/**
 * The median time, in milliseconds, each Miragon rule may take to lint the 5,000-flow-node model on
 * its own. Deliberately loose: shared CI runners are slow and noisy. The machine-independent guard
 * is the scaling ratio below.
 */
export const targetTimeMsAt5000Nodes: Record<MiragonRuleName, number> = {
  'no-generated-ids': 50,
  'element-id-naming': 100,
  'worker-topic-naming': 50,
  'message-name-naming': 50,
  'flow-through-element': 50,
  'flow-connection-side': 50,
  'flow-target-alignment': 50,
  'flow-crossing': 50,
  'flow-orthogonal': 50,
  'boundary-event-marker-overlap': 50,
  'exclusive-gateway-marker-visible': 50,
  'async-continuations': 50,
  'label-alignment': 50,
  'label-placement': 50,
  'text-annotation-fit': 50,
};

/**
 * 10× the nodes: a linear rule lands near 10, a quadratic one near 100. The wide spread keeps the
 * check apart from runner effects: on some CI machines every rule, even one that does nearly
 * nothing, costs up to 1.8× more per element on the largest model.
 */
export const MAX_TIME_RATIO_5000_TO_500_NODES = 30;
