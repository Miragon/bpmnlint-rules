import { verify } from 'bpmnlint/lib/testers/rule-tester';

import rule from '../../src/rules/miragon/text-annotation-fit';
import { model } from '../support/model';
import type { ShapeSpec } from '../support/model';

const annotation = (text: string | undefined, width: number, height: number): ShapeSpec => ({
  id: 'textAnnotation_note',
  tag: 'textAnnotation',
  ...(text === undefined ? {} : { text }),
  x: 100,
  y: 100,
  width,
  height,
});

const withAnnotation = (shape: ShapeSpec) => model({ shapes: [shape] });

verify('text-annotation-fit', rule, {
  valid: [
    {
      name: 'a two-line annotation tall enough for its text and padding',
      moddleElement: withAnnotation(annotation('parallel gateway (splitting)', 140, 41)),
    },
    {
      name: 'a one-line annotation at the bpmn-js default size',
      moddleElement: withAnnotation(annotation('Checks the order', 100, 30)),
    },
    {
      name: 'an annotation without text',
      moddleElement: withAnnotation(annotation(undefined, 20, 10)),
    },
    {
      name: 'an annotation with blank text',
      moddleElement: withAnnotation(annotation('   ', 20, 10)),
    },
    {
      name: 'an annotation exactly as wide as its longest word plus padding',
      moddleElement: withAnnotation(annotation('Note', 34, 30)),
    },
    {
      name: 'a task with the size of a too small annotation',
      moddleElement: withAnnotation({
        id: 'task_note',
        name: 'Confirmation',
        width: 20,
        height: 10,
      }),
    },
    {
      name: 'an explicit line break counted as one line each',
      moddleElement: withAnnotation(annotation('first\nsecond', 200, 41)),
    },
  ],
  invalid: [
    {
      name: 'an annotation narrower than its padding',
      moddleElement: withAnnotation(annotation('Note', 10, 30)),
      report: {
        id: 'textAnnotation_note',
        message: 'Text annotation is narrower than the word "Note"; widen it to at least 34px',
      },
    },
    {
      name: 'a two-line annotation only as tall as its text',
      moddleElement: withAnnotation(annotation('parallel gateway (splitting)', 140, 34)),
      report: {
        id: 'textAnnotation_note',
        message: 'Text annotation is shorter than its text; raise it to at least 40px',
      },
    },
    {
      name: 'explicit line breaks that need more height',
      moddleElement: withAnnotation(annotation('first\nsecond\nthird', 200, 41)),
      report: {
        id: 'textAnnotation_note',
        message: 'Text annotation is shorter than its text; raise it to at least 54px',
      },
    },
    {
      name: 'an annotation narrower than its longest word',
      moddleElement: withAnnotation(annotation('Confirmation', 60, 30)),
      report: {
        id: 'textAnnotation_note',
        message:
          'Text annotation is narrower than the word "Confirmation"; widen it to at least 74px',
      },
    },
  ],
});
