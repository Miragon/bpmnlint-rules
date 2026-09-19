<script setup lang="ts">
import { ref } from 'vue';
import { withBase } from 'vitepress';

import SiteFooter from './SiteFooter.vue';

const installCommand = 'npm install --save-dev @miragon/bpmnlint-plugin-rules bpmnlint';
const copied = ref(false);

async function copyInstallCommand() {
  await navigator.clipboard.writeText(installCommand);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1600);
}
</script>

<template>
  <div class="screen">
    <section class="hero">
      <span class="eyebrow">bpmnlint plugin · MIT</span>
      <h1>
        BPMN that is <span class="mr-gradient-text">readable</span>, tidy and
        <span class="mr-gradient-text">deployable</span>.
      </h1>
      <p class="lede">
        Your team's modeling conventions, made executable: Miragon naming and layout rules, with
        bpmnlint's structural rules and the Camunda 7 / 8 deployability rules bundled in.
      </p>
      <div class="actions">
        <a class="action primary" :href="withBase('/guide')"
          >Get started <span aria-hidden="true">→</span></a
        >
        <a class="action ghost" :href="withBase('/rules/')">Browse rules</a>
      </div>
      <div class="setup">
        <div class="install">
          <span class="command"><span class="prompt">$ </span>{{ installCommand }}</span>
          <button type="button" :class="{ done: copied }" @click="copyInstallCommand">
            {{ copied ? 'Copied' : 'Copy' }}
          </button>
        </div>
        <dl class="facts">
          <div>
            <dt>Requires</dt>
            <dd>bpmnlint <b>&gt;=11</b> · Node <b>&gt;=22</b></dd>
          </div>
          <div>
            <dt>Engine rules</dt>
            <dd>Camunda 7 · Camunda 8</dd>
          </div>
          <div>
            <dt>Runs</dt>
            <dd>locally · in your modeler · in CI · in agent loops</dd>
          </div>
        </dl>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>

<style scoped>
.screen {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - var(--vp-nav-height));
}
.hero {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  inset: -40% -10% auto;
  height: 620px;
  background: radial-gradient(
    closest-side,
    rgba(37, 99, 235, 0.1),
    rgba(16, 185, 129, 0.05) 55%,
    transparent 75%
  );
  pointer-events: none;
}
.hero > * {
  position: relative;
}
.eyebrow {
  display: inline-block;
  margin-bottom: 22px;
  padding: 4px 12px;
  border: 1px solid var(--vp-c-brand-soft);
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
h1 {
  max-width: 860px;
  margin: 0 auto 20px;
  color: var(--vp-c-text-1);
  font-size: 60px;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.035em;
}
.lede {
  max-width: 640px;
  margin: 0 auto 30px;
  color: var(--vp-c-text-2);
  font-size: 19px;
  line-height: 1.6;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-bottom: 26px;
}
.action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: 0.15s;
}
.action.primary {
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
}
.action.primary:hover {
  transform: translateY(-1px);
}
.action.ghost {
  color: var(--vp-c-text-1);
}
.action.ghost:hover {
  background: var(--vp-c-bg-soft);
}
.setup {
  width: fit-content;
  max-width: 100%;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg);
  box-shadow: var(--mr-shadow);
  overflow: hidden;
}
.install {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 9px 9px 18px;
  font-family: var(--vp-font-family-mono);
  font-size: 13.5px;
}
.command {
  overflow-x: auto;
  white-space: nowrap;
}
.prompt {
  color: var(--mr-green);
  user-select: none;
}
.install button {
  flex: none;
  padding: 6px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  font-family: var(--vp-font-family-base);
  font-size: 12px;
  font-weight: 600;
}
.install button.done {
  border-color: var(--mr-green);
  color: var(--mr-green);
}
.facts {
  display: grid;
  grid-template-columns: auto auto auto;
  margin: 0;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  text-align: left;
}
.facts div {
  padding: 10px 18px 12px;
}
.facts div + div {
  border-left: 1px solid var(--vp-c-divider);
}
.facts dt {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.facts dd {
  margin: 2px 0 0;
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 500;
}
.facts b {
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 600;
}
@media (max-width: 900px) {
  .hero {
    padding: 56px 20px 36px;
  }
  h1 {
    font-size: 38px;
  }
  .lede {
    font-size: 17px;
  }
  .install {
    font-size: 11.5px;
  }
  .facts {
    grid-template-columns: 1fr;
  }
  .facts div + div {
    border-top: 1px solid var(--vp-c-divider);
    border-left: 0;
  }
}
</style>
