import { flowEndpointIds, PlaneRule } from '../../lib/di';
import type { DiagramPlane } from '../../lib/di';
import { BboxIndex, bboxOfPoints, segments, segmentsCross } from '../../lib/geometry';
import type { Bbox, Point } from '../../lib/geometry';
import type { ModdleElement, Reporter } from '../../lib/moddle';
import { defineRule } from '../../lib/utils/defineRule';

interface Flow {
  el: ModdleElement;
  endpoints: Set<string>;
  bbox: Bbox;
  segments: [Point, Point][];
}

/**
 * Reports a pair of sequence flows whose drawn paths CROSS (form an X) within the same plane.
 *
 * This is the edge-vs-edge gap bpmnlint leaves open: its `no-overlapping-elements` only compares
 * shape-vs-shape bounds and never inspects waypoints, and no rule anywhere tests one flow's route
 * against another's.
 *
 * Deliberately conservative, so it never fires on a clean diagram:
 * - Two flows that only run ON TOP OF each other (collinear overlap) are allowed. The strict
 *   crossing test {@link segmentsCross} reports an X, not an overlap.
 * - A pair of flows that share a node (both leave or enter the same gateway) is skipped entirely,
 *   so a fan-out/fan-in never reports itself even when its waypoints splay near the gateway tip.
 */
class FlowCrossing extends PlaneRule {
  protected checkPlane(plane: DiagramPlane, reporter: Reporter): void {
    const flows: Flow[] = plane.sequenceFlows.map((edge) => ({
      el: edge.el,
      endpoints: new Set<string>(flowEndpointIds(edge.el)),
      bbox: bboxOfPoints(edge.waypoints),
      segments: segments(edge.waypoints),
    }));

    const flowIndex = new BboxIndex(flows.map((flow) => flow.bbox));

    for (let outer = 0; outer < flows.length; outer++) {
      const first = flows[outer]!;
      const laterOverlappingFlows = flowIndex
        .overlapping(first.bbox)
        .filter((inner) => inner > outer);

      for (const inner of laterOverlappingFlows) {
        const second = flows[inner]!;

        if (this.shareNode(first, second)) {
          continue;
        }

        if (this.cross(first, second)) {
          reporter.report(first.el.id, `Sequence flow crosses <${second.el.id}>`);
          reporter.report(second.el.id, `Sequence flow crosses <${first.el.id}>`);
        }
      }
    }
  }

  /** Flows sharing a node fan out from / into it — never a crossing. */
  private shareNode(first: Flow, second: Flow): boolean {
    return [...first.endpoints].some((nodeId) => second.endpoints.has(nodeId));
  }

  private cross(first: Flow, second: Flow): boolean {
    return first.segments.some(([firstStart, firstEnd]) =>
      second.segments.some(([secondStart, secondEnd]) =>
        segmentsCross(firstStart, firstEnd, secondStart, secondEnd),
      ),
    );
  }
}

export default defineRule({ ruleName: 'flow-crossing', kind: 'layout-hint' }, FlowCrossing);
