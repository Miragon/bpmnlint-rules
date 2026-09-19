<script setup lang="ts">
import { data } from '../rules.data';
import LintTerminal from './LintTerminal.vue';
</script>

<template>
  <div class="pair">
    <LintTerminal file="order.bpmn" :findings="data.undeployable" />
    <LintTerminal file="order.bpmn" :findings="data.deployable" />
  </div>
</template>

<style scoped>
.pair {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin: 24px 0;
}
</style>
