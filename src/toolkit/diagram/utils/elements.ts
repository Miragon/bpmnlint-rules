/**
 * Moddle type tests over the elements a DI shape or edge draws. No semantic guessing, just moddle
 * type tests.
 */
import type { ModdleElement } from '../../../core/moddle';

/**
 * The root of a diagram's interchange layer (shapes, edges, bounds, waypoints, labels). A rule
 * that reads only the semantic model skips this subtree.
 */
export const isDiagramInterchangeRoot = (node: ModdleElement): boolean =>
  node.$type === 'bpmndi:BPMNDiagram';

/**
 * Inheritance-safe moddle type test — handles `bpmn:Transaction` extending `bpmn:SubProcess`,
 * `bpmn:AdHocSubProcess`, and so on. Defensive against malformed DI where `bpmnElement` may not
 * be a moddle object at all.
 */
export const inst = (el: ModdleElement, type: string): boolean =>
  !!el && typeof el.$instanceOf === 'function' && el.$instanceOf(type);

/**
 * Shapes that ENCLOSE flows, so a flow drawn "over" them is not a defect: pools, lanes and
 * groups always, and an EXPANDED sub-process. A collapsed sub-process is a task-sized box and
 * therefore a real obstacle.
 */
function isEnclosingContainer(el: ModdleElement, isExpanded: boolean): boolean {
  if (inst(el, 'bpmn:Participant') || inst(el, 'bpmn:Lane') || inst(el, 'bpmn:Group')) {
    return true;
  }

  if (inst(el, 'bpmn:SubProcess')) {
    return isExpanded === true;
  }

  return false;
}

/**
 * Shapes a sequence flow may legitimately pass over, so they are never routing obstacles:
 * enclosing containers, boundary events (they sit on an activity border where flows converge),
 * and decorative overlays — artifacts (text annotations, groups) and data objects/stores.
 */
export function isPassableShape(el: ModdleElement, isExpanded: boolean): boolean {
  return (
    isEnclosingContainer(el, isExpanded) ||
    inst(el, 'bpmn:BoundaryEvent') ||
    inst(el, 'bpmn:Artifact') ||
    inst(el, 'bpmn:ItemAwareElement')
  );
}

/**
 * The elements bpmn-js draws an external label for, at their DI label bounds (`isLabelExternal`
 * in `bpmn-js/lib/util/LabelUtil.js`). Every other element draws its name inside its shape and
 * ignores label bounds.
 */
const EXTERNAL_LABEL_TYPES = [
  'bpmn:Event',
  'bpmn:Gateway',
  'bpmn:DataStoreReference',
  'bpmn:DataObjectReference',
  'bpmn:DataInput',
  'bpmn:DataOutput',
  'bpmn:SequenceFlow',
  'bpmn:MessageFlow',
  'bpmn:Group',
];

export const isLabelExternal = (el: ModdleElement): boolean =>
  EXTERNAL_LABEL_TYPES.some((type) => inst(el, type));

/**
 * The node ids a sequence flow connects (its source and target).
 */
export const flowEndpointIds = (flow: ModdleElement): string[] =>
  [flow.sourceRef && flow.sourceRef.id, flow.targetRef && flow.targetRef.id].filter(
    Boolean,
  ) as string[];
