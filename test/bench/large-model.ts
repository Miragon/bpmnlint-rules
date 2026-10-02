/**
 * The synthetic Camunda 7 model from Miragon/bpmn-modeler#1572 (`scripts/perf/largeBpmnModel.mjs`):
 * `rows` independent straight chains of `perRow` flow nodes each. The XML is byte-identical to that
 * generator, so timings stay comparable across both repositories.
 */
export const largeModelPresets = {
  500: { rows: 10, perRow: 50 },
  2000: { rows: 40, perRow: 50 },
  5000: { rows: 100, perRow: 50 },
} as const;

const ROW_HEIGHT = 140;
const COLUMN_WIDTH = 160;
const EVENT_SIZE = { width: 36, height: 36 };
const GATEWAY_SIZE = { width: 50, height: 50 };
const TASK_SIZE = { width: 100, height: 80 };

interface LargeModelShape {
  rows: number;
  perRow: number;
}

interface FlowNode {
  id: string;
  tagName: string;
  attributes: string;
  x: number;
  rowTop: number;
  width: number;
  height: number;
}

function createFlowNode(row: number, column: number, perRow: number): FlowNode {
  const position = { x: 100 + column * COLUMN_WIDTH, rowTop: 80 + row * ROW_HEIGHT };

  if (column === 0) {
    return {
      id: `start_${row}`,
      tagName: 'startEvent',
      attributes: `name="Start ${row}" camunda:asyncBefore="true"`,
      ...position,
      ...EVENT_SIZE,
    };
  }
  if (column === perRow - 1) {
    return {
      id: `end_${row}`,
      tagName: 'endEvent',
      attributes: `name="End ${row}"`,
      ...position,
      ...EVENT_SIZE,
    };
  }
  if (column % 5 === 0) {
    return {
      id: `gw_${row}_${column}`,
      tagName: 'exclusiveGateway',
      attributes: `name="Check ${row}/${column}?"`,
      ...position,
      ...GATEWAY_SIZE,
    };
  }
  if (column % 2 === 0) {
    return {
      id: `user_${row}_${column}`,
      tagName: 'userTask',
      attributes: `name="Review item ${row}/${column}" camunda:assignee="\${initiator}" camunda:candidateGroups="team_${row}"`,
      ...position,
      ...TASK_SIZE,
    };
  }
  return {
    id: `svc_${row}_${column}`,
    tagName: 'serviceTask',
    attributes: `name="Process step ${row}/${column}" camunda:delegateExpression="#{step${row}x${column}Delegate}" camunda:asyncAfter="true"`,
    ...position,
    ...TASK_SIZE,
  };
}

export function generateLargeC7Model({ rows, perRow }: LargeModelShape) {
  const processElements: string[] = [];
  const shapes: string[] = [];
  const edges: string[] = [];

  for (let row = 0; row < rows; row++) {
    const flowNodes: FlowNode[] = [];
    for (let column = 0; column < perRow; column++) {
      flowNodes.push(createFlowNode(row, column, perRow));
    }

    flowNodes.forEach((node, index) => {
      const target = flowNodes[index + 1];
      const flowId = `f_${row}_${index}`;
      const y = node.rowTop + (TASK_SIZE.height - node.height) / 2;
      const incoming = index > 0 ? `<bpmn:incoming>f_${row}_${index - 1}</bpmn:incoming>` : '';
      const outgoing = target ? `<bpmn:outgoing>${flowId}</bpmn:outgoing>` : '';

      processElements.push(
        `    <bpmn:${node.tagName} id="${node.id}" ${node.attributes}>${incoming}${outgoing}</bpmn:${node.tagName}>`,
      );
      shapes.push(
        `      <bpmndi:BPMNShape id="${node.id}_di" bpmnElement="${node.id}"><dc:Bounds x="${node.x}" y="${y}" width="${node.width}" height="${node.height}" /></bpmndi:BPMNShape>`,
      );

      if (target) {
        const edgeY = node.rowTop + TASK_SIZE.height / 2;
        processElements.push(
          `    <bpmn:sequenceFlow id="${flowId}" sourceRef="${node.id}" targetRef="${target.id}" />`,
        );
        edges.push(
          `      <bpmndi:BPMNEdge id="${flowId}_di" bpmnElement="${flowId}"><di:waypoint x="${node.x + node.width}" y="${edgeY}" /><di:waypoint x="${target.x}" y="${edgeY}" /></bpmndi:BPMNEdge>`,
        );
      }
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:modeler="http://camunda.org/schema/modeler/1.0" id="Definitions_large" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Camunda Modeler" exporterVersion="5.20.0" modeler:executionPlatform="Camunda Platform" modeler:executionPlatformVersion="7.24.0">
  <bpmn:process id="largeProcess" isExecutable="true" camunda:historyTimeToLive="180">
${processElements.join('\n')}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="largeProcess">
${shapes.join('\n')}
${edges.join('\n')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

  return {
    xml,
    flowNodeCount: rows * perRow,
    sequenceFlowCount: rows * Math.max(perRow - 1, 0),
  };
}
