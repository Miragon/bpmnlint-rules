import llmstxt from 'vitepress-plugin-llms';

import {
  miragonRecommendedForModeling,
  miragonRuleFactories,
  MIRAGON_NAME,
} from '../../src/rules/miragon';
import { miragonDocs } from './miragon/config';
import { ruleExamples } from './ruleExamples';

const isLayoutHint = (ruleName: string) =>
  miragonRecommendedForModeling.rules?.[`${MIRAGON_NAME}/${ruleName}`] !== 'off';
const isAutomationRule = (ruleName: string) =>
  miragonRuleFactories[ruleName]?.kind === 'engine-specific';
const ruleNames = Object.keys(miragonRuleFactories);
const engineAgnosticRuleNames = ruleNames.filter((name) => !isAutomationRule(name));
const toSidebarItem = (ruleName: string) => ({ text: ruleName, link: `/rules/${ruleName}` });

export default miragonDocs({
  repo: 'Miragon/bpmnlint-rules',
  title: 'Miragon bpmnlint-rules',
  description:
    'A bpmnlint plugin bundling the standard structural rules, Camunda 7/8 deployability rules and Miragon BPMN conventions.',
  footerMessage: 'Released under the MIT License.',
  srcExclude: ['assets/rule-doc-template.md'],
  vite: { plugins: [ruleExamples(), llmstxt()] },
  nav: [
    { text: 'Guide', link: '/guide' },
    { text: 'Integrate', link: '/integrate/api', activeMatch: '/integrate/' },
    { text: 'Rules', link: '/rules/', activeMatch: '/rules/' },
    { text: 'Presets', link: '/presets' },
    { text: 'npm', link: 'https://www.npmjs.com/package/@miragon/bpmnlint-plugin-rules' },
  ],
  sidebar: [
    {
      text: 'Guide',
      items: [
        { text: 'Getting started', link: '/guide' },
        { text: 'Presets', link: '/presets' },
        { text: 'Camunda 7 / 8 engines', link: '/guide/engines' },
      ],
    },
    {
      text: 'Integrate',
      items: [
        { text: 'CI & programmatic API', link: '/integrate/api' },
        { text: 'Coding agents', link: '/integrate/agents' },
        { text: 'CI quality gates', link: '/integrate/ci' },
      ],
    },
    {
      text: 'Rules',
      items: [
        { text: 'Overview', link: '/rules/' },
        {
          text: 'Naming',
          link: '/rules/naming',
          items: engineAgnosticRuleNames.filter((name) => !isLayoutHint(name)).map(toSidebarItem),
        },
        {
          text: 'Layout',
          link: '/rules/layout',
          items: engineAgnosticRuleNames.filter(isLayoutHint).map(toSidebarItem),
        },
        {
          text: 'Automation',
          items: ruleNames.filter(isAutomationRule).map(toSidebarItem),
        },
      ],
    },
  ],
});
