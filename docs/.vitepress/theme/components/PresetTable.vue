<script setup lang="ts">
import { withBase } from 'vitepress';

import { data } from '../rules.data';

const categories = [
  { key: 'naming', label: 'Naming' },
  { key: 'layout', label: 'Layout' },
] as const;
const presets = ['modeling', 'automation', 'all'] as const;
</script>

<template>
  <div class="mr-card wrapper">
    <table>
      <thead>
        <tr>
          <th>Rule</th>
          <th>recommended-for-modeling<small>layout hints only</small></th>
          <th>recommended-for-automation<small>everything, non-blocking</small></th>
          <th>all<small>fails the build</small></th>
        </tr>
      </thead>
      <tbody>
        <template v-for="category in categories" :key="category.key">
          <tr class="group">
            <td colspan="4">{{ category.label }}</td>
          </tr>
          <tr
            v-for="rule in data.rules.filter((rule) => rule.category === category.key)"
            :key="rule.name"
          >
            <td>
              <a :href="withBase(`/rules/${rule.name}`)"
                ><code>{{ rule.name }}</code></a
              >
              <small>{{ rule.catches }}</small>
            </td>
            <td v-for="preset in presets" :key="preset">
              <span class="mr-severity" :class="rule.severities[preset]">{{
                rule.severities[preset]
              }}</span>
            </td>
          </tr>
        </template>
        <tr class="group">
          <td colspan="4">Bundled from bpmnlint</td>
        </tr>
        <tr>
          <td>
            <code>bpmnlint/standard-size</code>
            <small>Elements resized away from the BPMN standard size</small>
          </td>
          <td v-for="preset in presets" :key="preset">
            <span class="mr-severity" :class="data.standardSize[preset]">{{
              data.standardSize[preset]
            }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.wrapper {
  margin: 24px 0;
  overflow-x: auto;
}
table {
  display: table;
  width: 100%;
  min-width: 640px;
  margin: 0;
  border-collapse: collapse;
  font-size: 14px;
}
tr {
  border: 0;
  background: none !important;
}
th,
td {
  padding: 12px 16px;
  border: 0;
  border-bottom: 1px solid var(--vp-c-divider);
  text-align: center;
}
th:first-child,
td:first-child {
  text-align: left;
}
thead th {
  background: var(--vp-c-bg-soft);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  vertical-align: top;
}
th small,
td small {
  display: block;
  margin-top: 2px;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-base);
  font-size: 12.5px;
  font-weight: 400;
}
tr.group td {
  padding: 8px 16px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
tbody tr:last-child td {
  border-bottom: 0;
}
</style>
