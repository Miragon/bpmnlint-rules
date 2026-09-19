import { defineConfig } from 'vitepress';
import llmstxt from 'vitepress-plugin-llms';

import {
  miragonRecommendedForModeling,
  miragonRuleFactories,
  MIRAGON_NAME,
} from '../../src/rules/miragon';
import { ruleExamples } from './ruleExamples';

const repositoryUrl = 'https://github.com/Miragon/bpmnlint-rules';

const isLayoutHint = (ruleName: string) =>
  miragonRecommendedForModeling.rules?.[`${MIRAGON_NAME}/${ruleName}`] !== 'off';
const ruleNames = Object.keys(miragonRuleFactories);
const toSidebarItem = (ruleName: string) => ({ text: ruleName, link: `/rules/${ruleName}` });

export default defineConfig({
  title: 'bpmnlint-rules',
  description:
    'A bpmnlint plugin bundling the standard structural rules, Camunda 7/8 deployability rules and Miragon BPMN conventions.',
  base: '/bpmnlint-rules/',
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['assets/rule-doc-template.md'],
  vite: { plugins: [ruleExamples(), llmstxt()] },
  head: [['link', { rel: 'icon', type: 'image/png', href: '/bpmnlint-rules/miragon-favicon.png' }]],
  themeConfig: {
    logo: '/miragon-favicon.png',
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
        ],
      },
      {
        text: 'Rules',
        items: [
          { text: 'Overview', link: '/rules/' },
          {
            text: 'Naming',
            link: '/rules/naming',
            items: ruleNames.filter((name) => !isLayoutHint(name)).map(toSidebarItem),
          },
          {
            text: 'Layout',
            link: '/rules/layout',
            items: ruleNames.filter(isLayoutHint).map(toSidebarItem),
          },
        ],
      },
    ],
    outline: { level: [2, 3] },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: repositoryUrl }],
    editLink: { pattern: `${repositoryUrl}/edit/main/docs/:path` },
  },
});
