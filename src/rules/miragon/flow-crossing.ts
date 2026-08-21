import { collectByPlane, flowEndpointIds } from '../../lib/di';
import { bboxDisjoint, bboxOfPoints, segments, segmentsCross } from '../../lib/geometry';
import type { Bbox, Point } from '../../lib/geometry';
import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';

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
 *   crossing test in `lib/geometry.ts#segmentsCross` reports an X, not an overlap.
 * - A pair of flows that share a node (both leave or enter the same gateway) is skipped entirely,
 *   so a fan-out/fan-in never reports itself even when its waypoints splay near the gateway tip.
 */
export default function flowCrossing(): Rule {
  function check(node: ModdleElement, reporter: Reporter): void {
    if (node.$type !== 'bpmn:Definitions') {
      return;
    }

    for (const plane of collectByPlane(node)) {
      const flows: Flow[] = plane.edges
        .filter((edge) => edge.el.$type === 'bpmn:SequenceFlow')
        .map((edge) => ({
          el: edge.el,
          endpoints: new Set<string>(flowEndpointIds(edge.el)),
          bbox: bboxOfPoints(edge.waypoints),
          segments: segments(edge.waypoints),
        }));

      for (let outer = 0; outer < flows.length; outer++) {
        const first = flows[outer]!;

        for (let inner = outer + 1; inner < flows.length; inner++) {
          const second = flows[inner]!;

          // Flows sharing a node fan out from / into it — never a crossing.
          if ([...first.endpoints].some((nodeId) => second.endpoints.has(nodeId))) {
            continue;
          }

          if (bboxDisjoint(first.bbox, second.bbox)) {
            continue; // cheap reject
          }

          const cross = first.segments.some(([firstStart, firstEnd]) =>
            second.segments.some(([secondStart, secondEnd]) =>
              segmentsCross(firstStart, firstEnd, secondStart, secondEnd),
            ),
          );

          if (cross) {
            reporter.report(first.el.id, `Sequence flow crosses <${second.el.id}>`);
            reporter.report(second.el.id, `Sequence flow crosses <${first.el.id}>`);
          }
        }
      }
    }
  }

  return { check };
}
