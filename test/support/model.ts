import { createModdle } from 'bpmnlint/lib/testers/helper';

/**
 * Builds a minimal BPMN definition with a full DI layer from a declarative description.
 *
 * The layout rules decide purely on coordinates, so a spec should read as coordinates. This
 * helper keeps the XML boilerplate (namespaces, plane, shape/edge wrappers) out of the way so
 * each test case shows only the geometry that makes it pass or fail.
 *
 * Coordinates are optional: rules that only read the semantic tree (naming, labels) still need
 * a well-formed DI layer to exist, but do not care where anything sits, so those specs may omit
 * `x`/`y` and get a laid-out row for free.
 */
export interface ShapeSpec {
  id: string;
  tag?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  attachedTo?: string;
  isExpanded?: boolean;
  name?: string;
  default?: string;
  /**
   * Event-definition qualifiers to nest inside this shape, e.g. `['message']` renders a
   * `<bpmn:messageEventDefinition>`. Turns a plain event into a message/timer/... event.
   */
  eventDefinitions?: string[];
  /**
   * Id of the shape this one nests inside (e.g. a `startEvent` inside a `subProcess`). Nests the
   * element in the SEMANTIC tree only — every shape's DI stays flat on the plane, exactly as
   * bpmn.io renders an expanded sub-process.
   */
  parent?: string;
}

export interface EdgeSpec {
  id: string;
  tag?: string;
  source: string;
  target: string;
  waypoints?: { x: number; y: number }[];
  name?: string;
  condition?: string;
}

export interface ModelSpec {
  shapes?: ShapeSpec[];
  edges?: EdgeSpec[];
  processId?: string;
}

const DEFAULT_SIZE = { width: 100, height: 80 };

const escapeXml = (value: string): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#10;');

/**
 * `bpmn:FlowNode#incoming` / `#outgoing` are reference lists moddle reads from explicit child
 * elements — they are NOT derived from a flow's `sourceRef`/`targetRef`. Real modeler output always
 * writes them, and any rule that asks "how many flows leave this gateway" needs them, so the helper
 * writes them too.
 */
function semanticShape(
  shape: ShapeSpec,
  edges: EdgeSpec[],
  childrenOf: Map<string, ShapeSpec[]>,
): string {
  const tag = shape.tag || 'task';
  const attachedTo = shape.attachedTo ? ` attachedToRef="${shape.attachedTo}"` : '';
  const name = shape.name === undefined ? '' : ` name="${escapeXml(shape.name)}"`;
  const defaultFlow = shape.default ? ` default="${shape.default}"` : '';
  const open = `    <bpmn:${tag} id="${shape.id}"${attachedTo}${name}${defaultFlow}`;

  const connections = [
    ...edges
      .filter((edge) => edge.target === shape.id)
      .map((edge) => `incoming>${edge.id}</bpmn:incoming`),
    ...edges
      .filter((edge) => edge.source === shape.id)
      .map((edge) => `outgoing>${edge.id}</bpmn:outgoing`),
  ];

  const children = childrenOf.get(shape.id) || [];
  const eventDefinitions = (shape.eventDefinitions || []).map(
    (qualifier) => `      <bpmn:${qualifier}EventDefinition id="def_${shape.id}_${qualifier}" />`,
  );

  if (!connections.length && !children.length && !eventDefinitions.length) {
    return `${open} />`;
  }

  return [
    `${open}>`,
    ...connections.map((connection) => `      <bpmn:${connection}>`),
    ...eventDefinitions,
    ...children.map((child) => semanticShape(child, edges, childrenOf)),
    `    </bpmn:${tag}>`,
  ].join('\n');
}

function semanticEdge(edge: EdgeSpec): string {
  const tag = edge.tag || 'sequenceFlow';
  const name = edge.name === undefined ? '' : ` name="${escapeXml(edge.name)}"`;
  const open = `    <bpmn:${tag} id="${edge.id}" sourceRef="${edge.source}" targetRef="${edge.target}"${name}`;

  if (edge.condition === undefined) {
    return `${open} />`;
  }

  return [
    `${open}>`,
    `      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escapeXml(edge.condition)}</bpmn:conditionExpression>`,
    `    </bpmn:${tag}>`,
  ].join('\n');
}

function diShape(shape: ShapeSpec, index: number): string {
  const { width, height } = { ...DEFAULT_SIZE, ...shape };
  const expanded = shape.isExpanded === undefined ? '' : ` isExpanded="${shape.isExpanded}"`;
  const posX = shape.x === undefined ? 100 + index * 200 : shape.x;
  const posY = shape.y === undefined ? 100 : shape.y;

  return [
    `      <bpmndi:BPMNShape id="di_${shape.id}" bpmnElement="${shape.id}"${expanded}>`,
    `        <dc:Bounds x="${posX}" y="${posY}" width="${width}" height="${height}" />`,
    '      </bpmndi:BPMNShape>',
  ].join('\n');
}

function diEdge(edge: EdgeSpec, index: number): string {
  // A well-formed edge needs at least two waypoints. Specs that do not care about routing get a
  // short stub segment placed out of the way, one row per edge.
  const points = edge.waypoints || [
    { x: 0, y: 1000 + index * 100 },
    { x: 50, y: 1000 + index * 100 },
  ];

  const waypoints = points
    .map((point) => `        <di:waypoint x="${point.x}" y="${point.y}" />`)
    .join('\n');

  return [
    `      <bpmndi:BPMNEdge id="di_${edge.id}" bpmnElement="${edge.id}">`,
    waypoints,
    '      </bpmndi:BPMNEdge>',
  ].join('\n');
}

function modelXml({ shapes = [], edges = [], processId = 'process_Test' }: ModelSpec): string {
  // Semantic tree: nest children under their parent, render only the roots. DI stays flat (below).
  const childrenOf = new Map<string, ShapeSpec[]>();
  for (const shape of shapes) {
    if (shape.parent) {
      (childrenOf.get(shape.parent) ?? childrenOf.set(shape.parent, []).get(shape.parent)!).push(
        shape,
      );
    }
  }
  const roots = shapes.filter((shape) => !shape.parent);

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
    xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
    xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    id="definitions_Test"
    targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${processId}" isExecutable="true">
${roots.map((shape) => semanticShape(shape, edges, childrenOf)).join('\n')}
${edges.map(semanticEdge).join('\n')}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="diagram_Test">
    <bpmndi:BPMNPlane id="plane_Test" bpmnElement="${processId}">
${shapes.map(diShape).join('\n')}
${edges.map(diEdge).join('\n')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

/** A moddle root, ready for bpmnlint's RuleTester. */
export function model(spec: ModelSpec): Promise<unknown> {
  return createModdle(modelXml(spec));
}
