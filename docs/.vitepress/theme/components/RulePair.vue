<script setup lang="ts">
import { computed } from 'vue';
import { withBase } from 'vitepress';

import { diagramUrl } from '../diagrams';
import { data } from '../rules.data';
import RuleStage from './RuleStage.vue';

const props = defineProps<{ rule: string }>();
const catches = computed(() => data.rules.find(({ name }) => name === props.rule)?.catches);
</script>

<template>
  <RuleStage :rule="rule">
    <template #reported
      ><img :src="diagramUrl(rule, 'invalid')" :alt="`Reported model for ${rule}`"
    /></template>
    <template #clean
      ><img :src="diagramUrl(rule, 'valid')" :alt="`Clean model for ${rule}`"
    /></template>
    <template #reported-caption>
      {{ catches }}. <a :href="withBase(`/rules/${rule}`)">Read the rule</a>
    </template>
    <template #clean-caption>
      The same process, drawn so the rule stays quiet.
      <a :href="withBase(`/rules/${rule}`)">Read the rule</a>
    </template>
  </RuleStage>
</template>
