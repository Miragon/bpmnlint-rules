<script setup lang="ts">
import { computed } from 'vue';

import type { Finding } from '../rules.data';

const props = defineProps<{ file: string; findings: Finding[] }>();

const errorCount = computed(
  () => props.findings.filter(({ category }) => category === 'error').length,
);
const warningCount = computed(() => props.findings.length - errorCount.value);
const passed = computed(() => props.findings.length === 0);

const counted = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;
const summary = computed(
  () =>
    `${counted(props.findings.length, 'problem')} (${counted(errorCount.value, 'error')}, ${counted(warningCount.value, 'warning')})`,
);
</script>

<template>
  <div class="terminal" :class="passed ? 'good' : 'bad'">
    <div class="bar"><u /><u /><u /><span>zsh</span></div>
    <div class="output">
      <p><span class="prompt">$</span> npx bpmnlint {{ file }}</p>
      <p v-if="passed" class="result">
        <span class="badge ok">PASSED</span> <span class="dim">no findings</span>
      </p>
      <template v-else>
        <p class="underline">{{ file }}</p>
        <ul>
          <li v-for="finding in findings" :key="finding.rule + finding.id">
            <span class="dim">{{ finding.id }}</span>
            <span :class="finding.category">{{ finding.category }}</span>
            <span class="dim">{{ finding.rule }}</span>
            <span class="message">{{ finding.message }}</span>
          </li>
        </ul>
        <p class="result">
          <span class="badge failed">{{ errorCount > 0 ? 'FAILED' : 'WARNED' }}</span>
          <span class="error">{{ summary }}</span>
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.terminal {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #1e293b;
  border-radius: 12px;
  background: var(--mr-terminal-bg);
  box-shadow: var(--mr-shadow);
  overflow: hidden;
}
.terminal.bad {
  border-top: 3px solid var(--mr-red);
}
.terminal.good {
  border-top: 3px solid var(--mr-green);
}
.bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 11px 14px;
  border-bottom: 1px solid #1e293b;
}
.bar u {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #334155;
}
.bar span {
  margin-left: 8px;
  color: #94a3b8;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}
.output {
  flex: 1;
  padding: 18px;
  color: #cbd5e1;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 1.75;
}
.output p {
  margin: 0;
}
.output ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.output li {
  display: flex;
  flex-wrap: wrap;
  gap: 0 16px;
  margin: 6px 0 0;
  padding-left: 16px;
}
.message {
  flex-basis: 100%;
  overflow-wrap: anywhere;
}
.result {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px !important;
}
.underline {
  margin-top: 14px !important;
}
.prompt {
  color: #34d399;
}
.dim {
  color: #64748b;
}
.error {
  color: #f87171;
}
.warn {
  color: #fbbf24;
}
.underline {
  color: #e2e8f0;
  text-decoration: underline;
}
.badge {
  display: inline-block;
  padding: 0 8px;
  border-radius: 4px;
  font-weight: 600;
}
.badge.failed {
  background: #7f1d1d;
  color: #fecaca;
}
.badge.ok {
  background: #064e3b;
  color: #a7f3d0;
}
</style>
