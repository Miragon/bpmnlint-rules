import type { Side } from '../../../toolkit/geometry';
import type { Category, Direction } from './types';

const CATEGORY_LABEL: Record<Category, string> = {
  event: 'an event',
  gateway: 'a gateway',
  activity: 'an activity',
};

/**
 * The findings `flow-connection-side` reports.
 */
export class ConnectionSideMessages {
  constructor(private readonly minStubLength: number) {}

  diagonalGateway(id: string): string {
    return `Sequence flow connects to <${id}> on a diagonal; a gateway must connect at one of its four tips`;
  }

  wrongSide(
    direction: Direction,
    id: string,
    side: Side,
    category: Category,
    allowed: Side[],
  ): string {
    const sides =
      allowed.length <= 1
        ? (allowed[0] ?? '')
        : `${allowed.slice(0, -1).join(', ')} or ${allowed.at(-1)}`;

    return direction === 'incoming'
      ? `Sequence flow enters <${id}> from the ${side}; ${CATEGORY_LABEL[category]} must be entered from the ${sides}`
      : `Sequence flow leaves <${id}> to the ${side}; ${CATEGORY_LABEL[category]} must exit to the ${sides}`;
  }

  shortStub(direction: Direction, id: string, side: Side, stub: number): string {
    const stubPx = Math.max(0, Math.round(stub));
    const min = this.minStubLength;

    return direction === 'incoming'
      ? `Sequence flow enters <${id}> from the ${side} with only a ${stubPx}px stub; it must run at least ${min}px straight in before turning`
      : `Sequence flow leaves <${id}> to the ${side} with only a ${stubPx}px stub; it must run at least ${min}px straight out before turning`;
  }
}
