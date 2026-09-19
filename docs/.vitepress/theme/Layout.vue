<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';

import RuleFacts from './components/RuleFacts.vue';

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #aside-outline-before>
      <RuleFacts />
    </template>
  </Layout>
</template>
