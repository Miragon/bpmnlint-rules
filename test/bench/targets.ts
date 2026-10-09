import type { MiragonRuleName } from '../../src/rules/miragon';

/**
 * The median time, in milliseconds, each Miragon rule may take to lint the 5,000-flow-node model on
 * its own. Deliberately loose: shared CI runners are slow and noisy. The machine-independent guard
 * is the scaling ratio below.
 */
export const targetTimeMsAt5000Nodes: Record<MiragonRuleName, number> = {
  'no-generated-ids': 50,
  'element-id-naming': 100,
  'flow-through-element': 50,
  'flow-connection-side': 50,
  'flow-target-alignment': 50,
  'flow-crossing': 50,
  'flow-orthogonal': 50,
  'boundary-event-marker-overlap': 50,
};

/** 2.5× the nodes: a linear rule lands near 2.5, a quadratic one near 6.25. */
export const MAX_TIME_RATIO_5000_TO_2000_NODES = 4;
