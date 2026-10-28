import { is } from 'bpmnlint-utils';
import { ERROR_TYPES } from 'bpmnlint-plugin-camunda-compat/rules/utils/error-types.js';
import { reportErrors } from 'bpmnlint-plugin-camunda-compat/rules/utils/reporter.js';

import type { Engine } from '../../../lib/bpmnlint-config';
import { C8Events } from '../../../lib/engine/c8-tasks/C8Events';
import { ExecutableScope } from '../../../lib/engine/c8-tasks/ExecutableScope';
import { ModdlePath } from '../../../lib/engine/c8-tasks/ModdlePath';
import { hasName, isBlank, isFeel } from '../../../lib/engine/c8-tasks/utils/value';
import { ZeebeExtensions } from '../../../lib/engine/c8-tasks/ZeebeExtensions';
import { EngineRule } from '../../../lib/engine/EngineRule';
import { describeElement } from '../../../lib/engine/utils/describe';
import { FeelExpression } from '../../../lib/feel/FeelExpression';
import type { ModdleElement, Reporter, ReportPath } from '../../../lib/moddle';
import { defineRule } from '../../../lib/utils/defineRule';

/** Where a value sits: the element reported on, the element holding the property, and the path. */
interface ValueSite {
  owner: ModdleElement;
  holder: ModdleElement;
  property: string;
  path: ReportPath;
}

/**
 * Reports values Camunda 8 parses as FEEL at deploy and refuses: a `=` value that is no valid FEEL
 * (JUEL habits named), and a static or JUEL value where Camunda 8 needs a FEEL expression.
 */
class C8FeelExpression extends EngineRule {
  protected readonly engine: Engine = 'c8';

  private static readonly FEEL_ATTRIBUTES: Record<string, string[]> = {
    'zeebe:TaskDefinition': ['type', 'retries'],
    'zeebe:LoopCharacteristics': ['inputCollection', 'outputElement'],
    'zeebe:CalledElement': ['processId'],
    'zeebe:CalledDecision': ['decisionId'],
    'zeebe:Script': ['expression'],
    'zeebe:Subscription': ['correlationKey'],
    'zeebe:AssignmentDefinition': ['assignee', 'candidateGroups', 'candidateUsers'],
    'zeebe:TaskSchedule': ['dueDate', 'followUpDate'],
    'zeebe:PriorityDefinition': ['priority'],
    'zeebe:AdHoc': ['activeElementsCollection', 'outputElement'],
  };

  private static readonly TIMER_KINDS = ['timeDate', 'timeDuration', 'timeCycle'];

  protected checkElement(node: ModdleElement, reporter: Reporter): void {
    if (is(node, 'bpmn:Definitions')) {
      this.checkMessageAndSignalNames(node, reporter);
      return;
    }
    if (String(node.$type).startsWith('zeebe:')) {
      this.checkExtension(node, reporter);
      return;
    }
    if (!ExecutableScope.covers(node) || is(node, 'bpmn:Transaction')) {
      return;
    }
    if (is(node, 'bpmn:SequenceFlow')) {
      this.checkCondition(node, reporter, node.conditionExpression, `sequence flow ${node.id}`);
    }
    if (is(node, 'bpmn:AdHocSubProcess')) {
      this.checkCondition(
        node,
        reporter,
        node.completionCondition,
        `ad-hoc sub-process ${node.id}`,
      );
    }
    if (is(node, 'bpmn:Activity')) {
      this.checkMultiInstance(node, reporter);
    }
    if (is(node, 'bpmn:ScriptTask')) {
      this.checkScript(node, reporter);
    }
    if (is(node, 'bpmn:ReceiveTask')) {
      this.checkCorrelationKey(node, reporter);
    }
    if (is(node, 'bpmn:Event')) {
      this.checkEvent(node, reporter);
    }
  }

  private checkExtension(node: ModdleElement, reporter: Reporter): void {
    const host = ZeebeExtensions.readHostOf(node);
    if (!host) {
      return;
    }
    const attributes = C8FeelExpression.FEEL_ATTRIBUTES[node.$type] ?? [];
    this.checkFeelAttributes(node, attributes, host, '', reporter);
    if (is(node, 'zeebe:IoMapping')) {
      for (const mapping of [...(node.inputParameters ?? []), ...(node.outputParameters ?? [])]) {
        this.checkFeelAttributes(mapping, ['source'], host, ' (in zeebe:ioMapping)', reporter);
      }
    }
  }

  private checkFeelAttributes(
    element: ModdleElement,
    attributes: string[],
    host: ModdleElement,
    container: string,
    reporter: Reporter,
  ): void {
    const owner = ModdlePath.ownerOf(host);
    const where = `${ZeebeExtensions.elementName(element)}${container} of ${this.describeHost(host, owner)}`;
    for (const attribute of attributes) {
      this.checkSyntax(
        reporter,
        `${attribute} of ${where}`,
        element[attribute],
        this.siteOf(owner, element, attribute),
      );
    }
  }

  private checkCondition(
    node: ModdleElement,
    reporter: Reporter,
    condition: ModdleElement | undefined,
    label: string,
  ): void {
    if (!condition) {
      return;
    }
    const property = is(node, 'bpmn:SequenceFlow') ? 'conditionExpression' : 'completionCondition';
    const site = { owner: node, holder: node, property, path: [property] };
    const what = is(node, 'bpmn:SequenceFlow') ? 'condition' : 'completion condition';
    const body: string = condition.body ?? '';
    if (isFeel(body)) {
      this.checkSyntax(reporter, `The ${what} of ${label}`, body, site);
      return;
    }
    this.reportNotFeel(
      site,
      reporter,
      `The ${what} "${body.trim()}" of ${label} is no FEEL expression; Camunda 8 needs one starting with = and refuses the file`,
    );
  }

  private checkMultiInstance(activity: ModdleElement, reporter: Reporter): void {
    const loop = activity.loopCharacteristics;
    if (!loop || !is(loop, 'bpmn:MultiInstanceLoopCharacteristics')) {
      return;
    }
    const label = `multi-instance ${describeElement(activity)}`;
    const zeebeLoop = ZeebeExtensions.valuesOf(loop, 'zeebe:LoopCharacteristics')[0];
    if (zeebeLoop) {
      const input = zeebeLoop.inputCollection;
      if (!isBlank(input) && !isFeel(input)) {
        this.reportStatic(activity, zeebeLoop, 'inputCollection', `of ${label}`, reporter);
      }
      const output = zeebeLoop.outputElement;
      if (zeebeLoop.outputCollection !== undefined && output !== undefined && !isFeel(output)) {
        this.reportStatic(activity, zeebeLoop, 'outputElement', `of ${label}`, reporter);
      }
    }
    if (loop.completionCondition) {
      this.checkSyntax(
        reporter,
        `The completion condition of ${label}`,
        loop.completionCondition.body,
        {
          owner: activity,
          holder: loop,
          property: 'completionCondition',
          path: ['loopCharacteristics', 'completionCondition'],
        },
      );
    }
  }

  private checkScript(task: ModdleElement, reporter: Reporter): void {
    const script = ZeebeExtensions.valuesOf(task, 'zeebe:Script')[0];
    if (!script || ZeebeExtensions.valuesOf(task, 'zeebe:TaskDefinition').length) {
      return;
    }
    const expression = script.expression;
    if (isBlank(expression) || isFeel(expression)) {
      return;
    }
    this.reportNotFeel(
      this.siteOf(task, script, 'expression'),
      reporter,
      `The zeebe:script expression "${expression}" of ${describeElement(task)} is a static value; Camunda 8 needs a FEEL expression starting with = and refuses the file`,
    );
  }

  private checkEvent(event: ModdleElement, reporter: Reporter): void {
    const definition = C8Events.definitionOf(event);
    if (!definition) {
      return;
    }
    if (is(definition, 'bpmn:TimerEventDefinition')) {
      this.checkTimer(event, definition, reporter);
    } else if (is(definition, 'bpmn:ConditionalEventDefinition')) {
      this.checkConditionalEvent(event, definition, reporter);
    } else if (is(definition, 'bpmn:MessageEventDefinition') && is(event, 'bpmn:CatchEvent')) {
      this.checkCorrelationKey(event, reporter);
    }
  }

  private checkTimer(event: ModdleElement, definition: ModdleElement, reporter: Reporter): void {
    const kinds = C8FeelExpression.TIMER_KINDS.filter((kind) => definition[kind]);
    const [kind] = kinds;
    if (kinds.length !== 1 || !kind) {
      return;
    }
    if (kind === 'timeCycle' && is(event, 'bpmn:IntermediateCatchEvent')) {
      return;
    }
    this.checkSyntax(
      reporter,
      `The ${kind} of ${describeElement(event)}`,
      definition[kind].body,
      this.siteOf(event, definition, kind),
    );
  }

  private checkConditionalEvent(
    event: ModdleElement,
    definition: ModdleElement,
    reporter: Reporter,
  ): void {
    const condition = definition.condition;
    if (!condition) {
      return;
    }
    const site = this.siteOf(event, definition, 'condition');
    const body = condition.body;
    if (isFeel(body)) {
      this.checkSyntax(reporter, `The condition of conditional event ${event.id}`, body, site);
      return;
    }
    this.reportNotFeel(
      site,
      reporter,
      `The condition "${(body ?? '').trim()}" of conditional event ${event.id} is no FEEL expression; Camunda 8 needs one starting with = and refuses the file`,
    );
  }

  private checkCorrelationKey(el: ModdleElement, reporter: Reporter): void {
    const holder = C8Events.messageHolderOf(el);
    const message = holder?.messageRef;
    if (!message || !hasName(message)) {
      return;
    }
    if (is(el, 'bpmn:StartEvent') && is(el.$parent, 'bpmn:Process')) {
      return;
    }
    const subscriptions = ZeebeExtensions.valuesOf(message, 'zeebe:Subscription');
    const subscription = subscriptions[0];
    const key = subscription?.correlationKey;
    if (subscriptions.length !== 1 || isBlank(key) || isFeel(key)) {
      return;
    }
    this.reportNotFeel(
      {
        owner: el,
        holder: subscription,
        property: 'correlationKey',
        path: [
          ...ModdlePath.between(el, holder),
          'messageRef',
          ...ModdlePath.between(message, subscription),
          'correlationKey',
        ],
      },
      reporter,
      `The correlationKey "${key}" of message ${message.id} is a static value; Camunda 8 needs a FEEL expression (=${key.trim()}) and refuses the file`,
    );
  }

  private checkMessageAndSignalNames(definitions: ModdleElement, reporter: Reporter): void {
    for (const used of this.usedMessagesAndSignals(definitions)) {
      if (!used.id || !hasName(used)) {
        continue;
      }
      const kind = is(used, 'bpmn:Signal') ? 'signal' : 'message';
      this.checkSyntax(reporter, `The name of ${kind} ${used.id}`, used.name, {
        owner: used,
        holder: used,
        property: 'name',
        path: ['name'],
      });
    }
  }

  private usedMessagesAndSignals(definitions: ModdleElement): Set<ModdleElement> {
    const used = new Set<ModdleElement>();
    const pending: ModdleElement[] = (definitions.rootElements ?? []).filter(
      (root: ModdleElement) => is(root, 'bpmn:Process'),
    );
    while (pending.length) {
      const container = pending.pop();
      for (const element of container.flowElements ?? []) {
        if (element.flowElements) {
          pending.push(element);
        }
        if (!is(element, 'bpmn:FlowNode')) {
          continue;
        }
        const message = C8Events.messageOf(element);
        if (message) {
          used.add(message);
        }
        for (const definition of element.eventDefinitions ?? []) {
          if (is(definition, 'bpmn:SignalEventDefinition') && definition.signalRef) {
            used.add(definition.signalRef);
          }
        }
      }
    }
    return used;
  }

  private reportStatic(
    activity: ModdleElement,
    zeebeLoop: ModdleElement,
    property: string,
    where: string,
    reporter: Reporter,
  ): void {
    const value: string = zeebeLoop[property];
    this.reportNotFeel(
      this.siteOf(activity, zeebeLoop, property),
      reporter,
      `${property}="${value}" ${where} is a static value; Camunda 8 needs a FEEL expression (=${value.trim()}) and refuses the file`,
    );
  }

  private checkSyntax(reporter: Reporter, what: string, value: unknown, site: ValueSite): void {
    if (!isFeel(value)) {
      return;
    }
    const expression = String(value).trim();
    const problem = new FeelExpression(expression.slice(1)).problem();
    if (!problem) {
      return;
    }
    this.report(
      site,
      reporter,
      `${what} "${expression}" is no valid FEEL: ${problem}; Camunda 8 parses it at deploy and refuses the file`,
      ERROR_TYPES.FEEL_EXPRESSION_INVALID,
    );
  }

  private reportNotFeel(site: ValueSite, reporter: Reporter, message: string): void {
    this.report(site, reporter, message, ERROR_TYPES.EXPRESSION_REQUIRED);
  }

  private report(site: ValueSite, reporter: Reporter, message: string, type: string): void {
    reportErrors(site.owner, reporter, {
      message,
      path: site.path,
      data: {
        type,
        node: site.holder,
        parentNode: site.holder === site.owner ? null : site.owner,
        property: site.property,
      },
    });
  }

  private siteOf(owner: ModdleElement, holder: ModdleElement, property: string): ValueSite {
    return { owner, holder, property, path: [...ModdlePath.between(owner, holder), property] };
  }

  private describeHost(host: ModdleElement, owner: ModdleElement): string {
    return host.id ? describeElement(host) : describeElement(host, owner);
  }
}

export default defineRule(
  { ruleName: 'c8-feel-expression', kind: 'engine-specific', targetEngine: 'c8', impact: 'deploy' },
  C8FeelExpression,
);
