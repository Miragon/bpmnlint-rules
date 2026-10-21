import type { Plugin } from 'vite';

const RULE_PAGE = /\/docs\/rules\/(?!(?:index|naming|layout)\.md$)[a-z-]+\.md$/;
const SEVERITY_NOTE = /^> This rule is .*\n\n/m;
const EXAMPLES_SECTION = /^## Examples\n[\s\S]*?(?=^## )/m;
const FIRST_SECTION = /^## /m;
const EXAMPLE_PAIR = /^👎 (.+)\n\n(!\[.*?\]\(.+?\))\n\n👍 (.+)\n\n(!\[.*?\]\(.+?\))$/m;

const toStage = (
  _match: string,
  reportedCaption: string,
  reported: string,
  cleanCaption: string,
  clean: string,
) =>
  `<RuleStage>
<template #reported>

${reported}

</template>
<template #clean>

${clean}

</template>
<template #reported-caption>

${reportedCaption}

</template>
<template #clean-caption>

${cleanCaption}

</template>
</RuleStage>`;

function leadWithExamples(markdown: string): string {
  const examples = EXAMPLES_SECTION.exec(markdown)?.[0];
  if (!examples) return markdown;
  return markdown.replace(examples, '').replace(FIRST_SECTION, `${examples}## `);
}

export function ruleExamples(): Plugin {
  return {
    name: 'miragon:rule-examples',
    enforce: 'pre',
    transform(markdown, id) {
      if (!RULE_PAGE.test(id)) return null;
      return leadWithExamples(markdown.replace(SEVERITY_NOTE, '')).replace(EXAMPLE_PAIR, toStage);
    },
  };
}
