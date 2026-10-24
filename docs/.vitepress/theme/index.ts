import type { Theme } from 'vitepress';
import { h } from 'vue';

import MiragonTheme from '../miragon/theme';
import AgentLoop from './components/AgentLoop.vue';
import DeployTerminals from './components/DeployTerminals.vue';
import HomeLanding from './components/HomeLanding.vue';
import PresetTable from './components/PresetTable.vue';
import RuleFacts from './components/RuleFacts.vue';
import RulePair from './components/RulePair.vue';
import RuleStage from './components/RuleStage.vue';
import './custom.css';

export default {
  extends: MiragonTheme,
  Layout: () => h(MiragonTheme.Layout!, null, { 'aside-outline-before': () => h(RuleFacts) }),
  enhanceApp({ app }) {
    app.component('AgentLoop', AgentLoop);
    app.component('DeployTerminals', DeployTerminals);
    app.component('HomeLanding', HomeLanding);
    app.component('PresetTable', PresetTable);
    app.component('RulePair', RulePair);
    app.component('RuleStage', RuleStage);
  },
} satisfies Theme;
