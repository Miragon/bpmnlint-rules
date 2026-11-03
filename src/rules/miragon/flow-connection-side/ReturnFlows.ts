import type { DiagramPlane } from '../../../toolkit/diagram';
import { isBackwardFlow } from '../../../toolkit/geometry';
import type { ModdleElement } from '../../../core/moddle';

/**
 * The return flows of one plane — right-to-left loop-backs, target drawn clearly left of its source.
 * With `allowBackwardsFlow: false` no flow counts as a return flow, keeping the strict policy.
 */
export class ReturnFlows {
  private readonly returnTargetIds = new Set<string>();

  constructor(
    private readonly plane: DiagramPlane,
    private readonly allowBackwardsFlow: boolean,
  ) {
    for (const flow of plane.sequenceFlows) {
      const target = flow.el.targetRef;
      if (target && this.isReturnFlow(flow.el.sourceRef, target)) {
        this.returnTargetIds.add(target.id);
      }
    }
  }

  /**
   * Right-to-left loop-back — target drawn clearly left of its source. A missing end counts as not
   * backward.
   */
  isReturnFlow(source: ModdleElement, target: ModdleElement): boolean {
    if (!this.allowBackwardsFlow || !source || !target) {
      return false;
    }
    const sourceBounds = this.plane.boundsOf(source.id);
    const targetBounds = this.plane.boundsOf(target.id);
    return !!sourceBounds && !!targetBounds && isBackwardFlow(sourceBounds, targetBounds);
  }

  /**
   * Targets of return flows sit inside the return lane. A return flow whose source is one of them is
   * a "chain member" (exits mirrored); any other is an "initiator" (exits forward).
   */
  isChainMember(source: ModdleElement): boolean {
    return !!source && this.returnTargetIds.has(source.id);
  }
}
