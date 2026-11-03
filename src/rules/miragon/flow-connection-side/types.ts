import type { ModdleElement } from '../../../core/moddle';
import type { Point } from '../../../toolkit/geometry';

export type Category = 'event' | 'gateway' | 'activity';
export type Direction = 'incoming' | 'outgoing';

/**
 * One end of a flow: `point` is the waypoint docked onto `ref`, `neighbor` the adjacent one.
 */
export interface Endpoint {
  direction: Direction;
  ref: ModdleElement;
  point: Point | undefined;
  neighbor: Point | undefined;
}

/**
 * What picks the policy for both ends of one flow.
 */
export interface Route {
  flowId: string;
  backward: boolean;
  sourceIsChainMember: boolean;
}
