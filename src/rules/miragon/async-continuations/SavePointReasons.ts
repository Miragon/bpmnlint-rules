import type { SavePointKey, Slot } from './SavePointDefaults';

const REMOTE_CALL =
  'Add camunda:asyncBefore so a failing call rolls back to this task, not the last wait state';
const WAIT_STATE =
  'Remove camunda:asyncBefore: a wait state already commits, the extra job is only overhead';
const JOIN =
  'Add camunda:asyncBefore so joining paths do not collide with an OptimisticLockingException';
const START = 'Add camunda:asyncBefore so the caller gets the instance back before work starts';
const TIMER_START =
  'Remove camunda:asyncBefore: a timer start event already fires as a job, a second one is overhead';
const MULTI_INSTANCE =
  'Add camunda:asyncBefore so the instances start in their own transaction, not the caller one';
const USER_TASK =
  'Add camunda:asyncAfter so completing the task commits before the following steps run';

/**
 * Why a default expects what it does, shown in the finding while the policy keeps that default.
 * Only `required` and `forbidden` defaults have a reason: an `allowed` slot is never reported, so
 * keys like `businessRuleTasks` or `exclusiveGateways` are missing on purpose.
 */
export const SAVE_POINT_REASONS: Record<Slot, Partial<Record<SavePointKey, string>>> = {
  before: {
    // Remote calls: without a save point a failure rolls back to the last wait state.
    serviceTasks: REMOTE_CALL,
    sendTasks: REMOTE_CALL,
    scriptTasks: REMOTE_CALL,
    messageIntermediateThrowEvents: REMOTE_CALL,
    messageEndEvents: REMOTE_CALL,

    // Wait states, external tasks included: the engine already commits here.
    userTasks: WAIT_STATE,
    receiveTasks: WAIT_STATE,
    intermediateCatchEvents: WAIT_STATE,
    eventBasedGateways: WAIT_STATE,
    externalServiceTasks: WAIT_STATE,
    externalSendTasks: WAIT_STATE,
    externalBusinessRuleTasks: WAIT_STATE,
    externalMessageIntermediateThrowEvents: WAIT_STATE,
    externalMessageEndEvents: WAIT_STATE,

    // Each with a reason of its own.
    parallelJoins: JOIN,
    inclusiveJoins: JOIN,
    startEvents: START,
    timerStartEvents: TIMER_START,
    multiInstanceBodies: MULTI_INSTANCE,
  },
  // Only the user task requires an asyncAfter by default, every other after slot is allowed.
  after: {
    userTasks: USER_TASK,
  },
};
