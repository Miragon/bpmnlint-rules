export type Expectation = 'required' | 'allowed' | 'forbidden';
export type Slot = 'before' | 'after';
export type SlotExpectations = Partial<Record<Slot, Expectation>>;

/**
 * The save points Camunda recommends, one line per element key: the `recommended` preset.
 */
export const SAVE_POINT_DEFAULTS = {
  serviceTasks: { before: 'required', after: 'allowed' },
  externalServiceTasks: { before: 'forbidden', after: 'allowed' },
  sendTasks: { before: 'required', after: 'allowed' },
  externalSendTasks: { before: 'forbidden', after: 'allowed' },
  businessRuleTasks: { before: 'allowed', after: 'allowed' },
  externalBusinessRuleTasks: { before: 'forbidden', after: 'allowed' },
  scriptTasks: { before: 'required', after: 'allowed' },
  userTasks: { before: 'forbidden', after: 'required' },
  receiveTasks: { before: 'forbidden', after: 'allowed' },
  manualTasks: { before: 'allowed', after: 'allowed' },
  undefinedTasks: { before: 'allowed', after: 'allowed' },
  callActivities: { before: 'allowed', after: 'allowed' },
  subProcesses: { before: 'allowed', after: 'allowed' },

  startEvents: { before: 'required', after: 'allowed' },
  timerStartEvents: { before: 'forbidden', after: 'allowed' },
  intermediateCatchEvents: { before: 'forbidden', after: 'allowed' },
  intermediateThrowEvents: { before: 'allowed', after: 'allowed' },
  messageIntermediateThrowEvents: { before: 'required', after: 'allowed' },
  externalMessageIntermediateThrowEvents: { before: 'forbidden', after: 'allowed' },
  endEvents: { before: 'allowed', after: 'allowed' },
  messageEndEvents: { before: 'required', after: 'allowed' },
  externalMessageEndEvents: { before: 'forbidden', after: 'allowed' },
  boundaryEvents: { after: 'allowed' },

  parallelGateways: { before: 'allowed', after: 'allowed' },
  parallelJoins: { before: 'required', after: 'allowed' },
  inclusiveGateways: { before: 'allowed', after: 'allowed' },
  inclusiveJoins: { before: 'required', after: 'allowed' },
  exclusiveGateways: { before: 'allowed', after: 'allowed' },
  eventBasedGateways: { before: 'forbidden', after: 'allowed' },

  multiInstanceBodies: { before: 'required', after: 'allowed' },
} satisfies Record<string, SlotExpectations>;

export type SavePointKey = keyof typeof SAVE_POINT_DEFAULTS;
