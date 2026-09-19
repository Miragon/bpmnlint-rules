<script setup lang="ts">
import { useCurrentRule } from '../useCurrentRule';

const rule = useCurrentRule();
const presets = [
  { key: 'modeling', label: 'recommended-for-modeling' },
  { key: 'automation', label: 'recommended-for-automation' },
  { key: 'all', label: 'all' },
] as const;
</script>

<template>
  <aside v-if="rule" class="facts" aria-label="Rule facts">
    <p class="title">Rule facts</p>
    <dl>
      <div>
        <dt>Category</dt>
        <dd class="category">{{ rule.category }}</dd>
      </div>
      <div v-for="preset in presets" :key="preset.key">
        <dt class="mono">{{ preset.label }}</dt>
        <dd>
          <span class="mr-severity" :class="rule.severities[preset.key]">{{
            rule.severities[preset.key]
          }}</span>
        </dd>
      </div>
    </dl>
    <p class="note">
      Override to <code>warn</code>, <code>error</code> or <code>off</code> in your own config.
    </p>
  </aside>
</template>

<style scoped>
.facts {
  margin-bottom: 24px;
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  font-size: 13px;
}
.title {
  margin: 0 0 8px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
dl {
  margin: 0;
}
dl div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-top: 1px solid var(--vp-c-divider);
}
dt {
  color: var(--vp-c-text-2);
}
dt.mono {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}
dd {
  margin: 0;
  font-weight: 600;
}
.category {
  text-transform: capitalize;
}
.note {
  margin: 8px 0 0;
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 1.5;
}
</style>
