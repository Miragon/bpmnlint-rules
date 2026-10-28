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
  'c8-boundary-host': 50,
  'c8-event-definition': 50,
  'c8-link-event': 50,
  'c8-ad-hoc-sub-process': 50,
  'c8-event-gateway': 50,
  'c8-message': 50,
  'c8-signal': 50,
  'c8-error': 50,
  'c8-start-event': 50,
  'c8-feel-expression': 50,
  'c8-feel-completion-condition': 50,
  'c8-implementation': 50,
  'c8-bad-value': 50,
  'c8-schema': 50,
  'c8-listener': 50,
  'c8-extension': 50,
  'c8-duplicate-extension': 50,
  'c8-foreign-content': 50,
  'c8-unknown-attribute': 50,
  'c8-misplaced-attribute': 50,
  'c8-misplaced-extension': 50,
};

/** 2.5× the nodes: a linear rule lands near 2.5, a quadratic one near 6.25. */
export const MAX_TIME_RATIO_5000_TO_2000_NODES = 4;
