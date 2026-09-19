import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';

import AgentLoop from './components/AgentLoop.vue';
import DeployTerminals from './components/DeployTerminals.vue';
import HomeHero from './components/HomeHero.vue';
import PresetTable from './components/PresetTable.vue';
import RulePair from './components/RulePair.vue';
import RuleStage from './components/RuleStage.vue';
import Layout from './Layout.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('AgentLoop', AgentLoop);
    app.component('DeployTerminals', DeployTerminals);
    app.component('HomeHero', HomeHero);
    app.component('PresetTable', PresetTable);
    app.component('RulePair', RulePair);
    app.component('RuleStage', RuleStage);
  },
} satisfies Theme;
