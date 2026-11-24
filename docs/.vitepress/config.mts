import llmstxt from 'vitepress-plugin-llms';

import {
  miragonRecommendedForModeling,
  miragonRuleFactories,
  MIRAGON_NAME,
} from '../../src/rules/miragon';
import { miragonDocs } from '@miragon/docs-starter';
import { ruleExamples } from './ruleExamples';

const isLayoutRule = (ruleName: string) =>
  miragonRecommendedForModeling.rules?.[`${MIRAGON_NAME}/${ruleName}`] !== 'off' ||
  miragonRuleFactories[ruleName]?.kind === 'cosmetic';
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
    { text: 'Get started', link: '/guide' },
    { text: 'Use it', link: '/integrate/github-action', activeMatch: '/integrate/' },
    { text: 'Rules', link: '/rules/', activeMatch: '/rules/' },
    { text: 'Presets', link: '/presets' },
    { text: 'npm', link: 'https://www.npmjs.com/package/@miragon/bpmnlint-plugin-rules' },
  ],
  sidebar: [
    {
      text: 'Start',
      items: [{ text: 'Getting started', link: '/guide' }],
    },
    {
      text: 'Use it',
      items: [
        { text: 'In pull requests: GitHub Action', link: '/integrate/github-action' },
        { text: 'In any CI or terminal: CLI', link: '/integrate/cli' },
        { text: 'With coding agents', link: '/integrate/agents' },
        { text: 'In your own code: API', link: '/integrate/api' },
        { text: 'AI visual review in CI', link: '/integrate/ci' },
      ],
    },
    {
      text: 'Configure',
      items: [
        { text: 'Presets', link: '/presets' },
        { text: 'Camunda 7 / 8 engines', link: '/guide/engines' },
      ],
    },
    {
      text: 'Rules',
      items: [
        { text: 'Overview', link: '/rules/' },
        {
          text: 'Naming',
          link: '/rules/naming',
          items: engineAgnosticRuleNames.filter((name) => !isLayoutRule(name)).map(toSidebarItem),
        },
        {
          text: 'Layout',
          link: '/rules/layout',
          items: engineAgnosticRuleNames.filter(isLayoutRule).map(toSidebarItem),
        },
        {
          text: 'Automation',
          items: ruleNames.filter(isAutomationRule).map(toSidebarItem),
        },
      ],
    },
  ],
});
