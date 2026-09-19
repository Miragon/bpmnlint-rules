<script setup lang="ts">
import { computed, ref } from 'vue';

import { data } from '../rules.data';
import { useCurrentRule } from '../useCurrentRule';

const props = defineProps<{ rule?: string }>();

const currentRule = useCurrentRule();
const rule = computed(
  () => data.rules.find(({ name }) => name === props.rule) ?? currentRule.value,
);
const showsReported = ref(true);
</script>

<template>
  <figure class="mr-card stage" :class="showsReported ? 'reported' : 'clean'">
    <header>
      <span class="dots"><u /><u /><u /></span>
      <span class="file">{{ rule?.name }}/{{ showsReported ? 'invalid' : 'valid' }}.bpmn</span>
      <span class="switch" role="radiogroup" aria-label="Example model">
        <button
          type="button"
          role="radio"
          :aria-checked="showsReported"
          @click="showsReported = true"
        >
          <i class="dot red" />Reported
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="!showsReported"
          @click="showsReported = false"
        >
          <i class="dot green" />Clean
        </button>
      </span>
    </header>

    <div class="canvas mr-diagram">
      <div v-show="showsReported"><slot name="reported" /></div>
      <div v-show="!showsReported"><slot name="clean" /></div>
    </div>

    <div v-if="showsReported" class="status findings">
      <b>{{ rule?.findings.length }} {{ rule?.findings.length === 1 ? 'finding' : 'findings' }}</b>
      <ul>
        <li v-for="finding in rule?.findings" :key="finding.id + finding.message">
          <code>{{ finding.id }}</code> {{ finding.message }}
        </li>
      </ul>
    </div>
    <div v-else class="status passed"><b>No findings</b></div>

    <figcaption>
      <div v-show="showsReported"><slot name="reported-caption" /></div>
      <div v-show="!showsReported"><slot name="clean-caption" /></div>
    </figcaption>
  </figure>
</template>

<style scoped>
.stage {
  margin: 24px 0;
}
header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.dots {
  display: flex;
  gap: 6px;
}
.dots u {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-divider);
}
.file {
  overflow: hidden;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.switch {
  display: inline-flex;
  gap: 2px;
  margin-left: auto;
  padding: 3px;
  border-radius: 999px;
  background: var(--vp-c-default-soft);
}
.switch button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px;
  border-radius: 999px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  font-weight: 600;
}
.switch button[aria-checked='true'] {
  background: var(--vp-c-bg);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.15);
  color: var(--vp-c-text-1);
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.dot.red {
  background: var(--mr-red);
}
.dot.green {
  background: var(--mr-green);
}
.canvas {
  min-height: 220px;
  background-color: #fff;
  background-image: radial-gradient(#e2e8f0 1px, transparent 1px);
  background-size: 16px 16px;
}
.canvas :deep(p) {
  margin: 0;
}
.canvas :deep(img) {
  margin: 0 auto;
}
.status {
  padding: 10px 16px;
  border-top: 1px solid;
  font-size: 13px;
}
.status b {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.status.findings {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}
.status.passed {
  border-color: #a7f3d0;
  background: #ecfdf5;
  color: #047857;
}
.dark .status.findings {
  border-color: rgba(248, 113, 113, 0.3);
  background: rgba(248, 113, 113, 0.08);
  color: #fca5a5;
}
.dark .status.passed {
  border-color: rgba(52, 211, 153, 0.3);
  background: rgba(52, 211, 153, 0.08);
  color: #6ee7b7;
}
.status ul {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}
.status li {
  margin: 2px 0;
  line-height: 1.5;
}
.status code {
  padding: 0;
  background: none;
  color: inherit;
  font-weight: 600;
}
figcaption {
  padding: 12px 16px;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  font-size: 14px;
}
figcaption :deep(p) {
  margin: 0;
  line-height: 1.6;
}
</style>
