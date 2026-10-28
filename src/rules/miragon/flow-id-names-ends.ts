import { is } from 'bpmnlint-utils';

import type { ModdleElement, Reporter, Rule } from '../../lib/moddle';
import { ElementIdConvention } from '../../lib/naming';
import type { ElementIdNamingConfig } from '../../lib/naming';
import { defineRule } from '../../lib/utils/defineRule';

const SPEAKING_JOIN = /[a-z0-9]To[A-Z0-9]|[_-]to[_-]/;
const COLLISION_SUFFIX = /(?:[_-]|No)?\d+$/;

/**
 * Reports a sequence flow whose id has the speaking form `flow_<source>To<target>` but no longer
 * names its current source and target, e.g. after the flow was reconnected in a modeler.
 *
 * An end is named by the speaking part of its id, by its name or by its prefix. The match is lenient on purpose:
 * either end may be cut short and a collision suffix (`_2`, `No2`) is ignored, so a flow is only
 * reported when neither of its ends can be read from its id. Ids in other forms (`Flow_0yq6cfd`,
 * `flow_approved`) are left to `element-id-naming` and `no-generated-ids`.
 *
 * Takes the same configuration as `element-id-naming`, so a project's own prefixes apply.
 */
class FlowIdNamesEnds implements Rule {
  private readonly convention: ElementIdConvention;

  constructor(config?: ElementIdNamingConfig) {
    this.convention = new ElementIdConvention(config);
  }

  check(node: ModdleElement, reporter: Reporter): void {
    if (!is(node, 'bpmn:SequenceFlow') || !node.id || !node.sourceRef || !node.targetRef) {
      return;
    }

    const prefix = this.convention.prefixOf(node);

    if (!prefix || !node.id.startsWith(prefix)) {
      return;
    }

    const body = node.id.slice(prefix.length);

    if (!SPEAKING_JOIN.test(body) || this.namesEnds(body, node.sourceRef, node.targetRef)) {
      return;
    }

    reporter.report(node.id, this.messageFor(prefix, node.sourceRef, node.targetRef));
  }

  private namesEnds(body: string, source: ModdleElement, target: ModdleElement): boolean {
    const sourceLabels = this.labelsOf(source);
    const targetLabels = this.labelsOf(target);
    const bodies = [body, body.replace(COLLISION_SUFFIX, '')].map((candidate) =>
      this.normalized(candidate),
    );

    return bodies.some((candidate) =>
      this.splitsAtTo(candidate).some(
        ([sourcePart, targetPart]) =>
          this.namedByAnyOf(sourceLabels, sourcePart.replace(/^from(?=\d)/, '')) &&
          this.namedByAnyOf(targetLabels, targetPart),
      ),
    );
  }

  private splitsAtTo(body: string): [string, string][] {
    const splits: [string, string][] = [];

    for (let index = body.indexOf('to', 1); index > 0; index = body.indexOf('to', index + 1)) {
      const targetPart = body.slice(index + 2);

      if (targetPart) {
        splits.push([body.slice(0, index), targetPart]);
      }
    }

    return splits;
  }

  private namedByAnyOf(labels: string[], part: string): boolean {
    return part.length > 0 && labels.some((label) => label.includes(part));
  }

  private labelsOf(end: ModdleElement): string[] {
    const kindWord = this.convention.prefixOf(end);

    return [this.speakingStemOf(end), end.name as string | undefined, kindWord ?? undefined]
      .map((label) => this.normalized(label ?? ''))
      .filter((label) => label.length > 0);
  }

  private speakingStemOf(end: ModdleElement): string {
    const prefix = this.convention.prefixOf(end);

    if (prefix && end.id.startsWith(prefix)) {
      return end.id.slice(prefix.length);
    }

    return end.id.slice(end.id.lastIndexOf('_') + 1);
  }

  private normalized(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[^A-Za-z0-9]/g, '')
      .toLowerCase();
  }

  private messageFor(prefix: string, source: ModdleElement, target: ModdleElement): string {
    const sourceStem = this.speakingStemOf(source);
    const targetStem = this.speakingStemOf(target);
    const expected = `${prefix}${sourceStem}To${targetStem.charAt(0).toUpperCase()}${targetStem.slice(1)}`;

    return `Flow id does not name its source and target, expected e.g. ${expected}`;
  }
}

export default defineRule({ ruleName: 'flow-id-names-ends', kind: 'convention' }, FlowIdNamesEnds);
