<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { withBase } from 'vitepress';

const installs = [
  { name: 'npm', line: 'npm i -D @miragon/bpmnlint-plugin-rules bpmnlint' },
  { name: 'pnpm', line: 'pnpm add -D @miragon/bpmnlint-plugin-rules bpmnlint' },
  { name: 'yarn', line: 'yarn add -D @miragon/bpmnlint-plugin-rules bpmnlint' },
];
const places = [
  {
    title: 'In the modeler',
    effect: 'On the element, while you draw.',
    link: '/presets',
  },
  {
    title: 'In the pull request',
    effect: 'An error fails the check.',
    link: '/integrate/ci',
  },
  {
    title: 'In the agent loop',
    effect: 'The agent fixes it itself.',
    link: '/integrate/agents',
  },
];

const selected = ref(0);
const copied = ref(false);

const reducedMotion = ref(true);
const moving = ref(false);
const chosen = ref(false);
const held = ref(false);
const cycling = computed(() => moving.value && !chosen.value && !held.value);
let tick: ReturnType<typeof setInterval> | undefined;
watch(cycling, (on) => {
  clearInterval(tick);
  if (on) tick = setInterval(() => step(1), 6000);
});
onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  moving.value = !reducedMotion.value;
});
onBeforeUnmount(() => clearInterval(tick));

function step(offset: number) {
  selected.value = (selected.value + offset + installs.length) % installs.length;
}

function choose(index: number) {
  chosen.value = true;
  selected.value = index;
}

const tabButtons = ref([] as HTMLButtonElement[]);
async function selectBy(offset: number) {
  chosen.value = true;
  step(offset);
  await nextTick();
  tabButtons.value[selected.value]?.focus();
}

async function copyInstall() {
  await navigator.clipboard.writeText(installs[selected.value].line);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1600);
}
</script>

<template>
  <div class="landing">
    <div class="frame">
      <section class="pitch">
        <h1>One <span class="accent">config</span>.<br />Every place BPMN<br />is written.</h1>
        <p class="lede">
          The same rules in the modeler, in the pull request and in your agent's loop. Miragon
          naming and layout rules, with the structural and Camunda 7&thinsp;/&thinsp;8 rules
          bundled.
        </p>

        <figure class="config">
          <figcaption><span>.bpmnlintrc</span><span class="quiet">one file</span></figcaption>
          <pre><span class="quiet">{</span>
  <span class="key">"extends"</span><span class="quiet">: [</span>
    <span class="quiet">"bpmnlint:recommended"</span><span class="quiet">,</span>
    <strong>"plugin:@miragon/rules/all"</strong>
  <span class="quiet">]</span>
<span class="quiet">}</span></pre>
        </figure>

        <div
          class="install"
          :class="{ cycling }"
          @mouseenter="held = true"
          @mouseleave="held = false"
          @focusin="held = true"
          @focusout="held = false"
        >
          <div
            class="tabs"
            role="tablist"
            aria-label="Install"
            @keydown.right.prevent="selectBy(1)"
            @keydown.left.prevent="selectBy(-1)"
          >
            <button
              v-for="(install, index) in installs"
              :key="install.name"
              ref="tabButtons"
              class="tab"
              role="tab"
              :aria-selected="index === selected"
              :tabindex="index === selected ? 0 : -1"
              @click="choose(index)"
            >
              {{ install.name }}
            </button>
            <button
              v-if="!reducedMotion"
              class="pause"
              type="button"
              :aria-pressed="!moving"
              @click="moving = !moving"
            >
              {{ moving ? 'Pause' : 'Play' }}
            </button>
          </div>
          <div class="command" role="tabpanel">
            <div class="channels">
              <pre
                v-for="(install, index) in installs"
                :key="install.name"
                :class="{ hidden: index !== selected }"
                :aria-hidden="index !== selected"
              ><span class="prompt">$ </span>{{ install.line }}</pre>
            </div>
            <button class="copy" type="button" @click="copyInstall">
              {{ copied ? 'Copied' : 'Copy' }}
            </button>
          </div>
        </div>
        <p class="meta">
          <span>Needs bpmnlint 11.14+ · Node 22+</span>
          <span class="pre-release">
            <span class="marker" aria-hidden="true" />
            <span><strong>0.16:</strong> pre-1.0, pin the version</span>
          </span>
        </p>
        <a class="start" :href="withBase('/guide')"
          >Lint your first model <span aria-hidden="true">→</span></a
        >
      </section>

      <section class="stage" aria-label="Where the rules run">
        <div v-for="(place, index) in places" :key="place.title" class="place">
          <a class="caption" :href="withBase(place.link)">
            <span class="number">0{{ index + 1 }}</span>
            <h2>{{ place.title }} <span class="go" aria-hidden="true">→</span></h2>
            <p>{{ place.effect }}</p>
          </a>

          <div class="window">
            <div class="titlebar">
              <span class="dots" aria-hidden="true"><i /><i /><i /></span>
              <template v-if="index === 0">
                <span class="name">Modeler</span><span>invoice.bpmn</span>
                <span class="right">2 problems</span>
              </template>
              <template v-else-if="index === 1">
                <span class="name">Pull request</span><span>Checks</span>
                <span class="right">lint-bpmn</span>
              </template>
              <template v-else>
                <span class="name">Agent loop</span><span>claude</span>
                <span class="right">PostToolUse</span>
              </template>
            </div>

            <div v-if="index === 0" class="canvas">
              <img
                class="cd-nur-hell"
                :src="withBase('/shots/landing-invoice.svg')"
                alt="The invoice approval with a lint badge on the task Check invoice"
              />
              <img
                class="cd-nur-dunkel"
                :src="withBase('/shots/landing-invoice-dark.svg')"
                alt="The invoice approval with a lint badge on the task Check invoice"
              />
              <span class="badge" aria-hidden="true">2</span>
              <div class="hint">Element id looks generated <code>no-generated-ids</code></div>
            </div>

            <div v-else-if="index === 1" class="check">
              <p class="failed">lint-bpmn · 2 errors</p>
              <div class="annotation">
                <span class="quiet">processes/invoice.bpmn</span>
                <span>Activity_0049ryx</span>
                <span class="quiet">Element id looks generated</span>
                <span class="quiet">@miragon/rules/no-generated-ids</span>
              </div>
            </div>

            <div v-else class="session">
              <span class="quiet">Write(processes/invoice.bpmn)</span>
              <span>Activity_0049ryx no-generated-ids</span>
              <span class="quiet">exit 2 → findings back to the agent</span>
              <span class="quiet">Edit: id → userTask_checkInvoice</span>
              <span class="clean">no problems</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.landing {
  box-sizing: border-box;
  --gutter: 32px;
  --line: 1px solid var(--cd-ui-linie);
  border-top: var(--line);
}
.frame {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  max-width: var(--vp-layout-max-width);
  margin: 0 auto;
}
@media (min-width: 1441px) {
  .frame {
    border-right: var(--line);
    border-left: var(--line);
  }
}

.pitch {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(16px, 3vh, 56px) var(--gutter);
  border-bottom: var(--line);
}
h1 {
  margin: 0;
  font-size: clamp(38px, min(4.2vw, 5.8vh), 56px);
  line-height: 1.02;
  font-weight: 700;
  letter-spacing: -0.045em;
}
.accent {
  color: var(--cd-ui-link);
}
.lede {
  max-width: 46ch;
  margin: clamp(10px, 2vh, 20px) 0 0;
  color: var(--cd-ui-text-leise);
  font-size: 15px;
  line-height: 1.55;
}

.config {
  margin: clamp(14px, 2.6vh, 28px) 0 0;
  border: var(--line);
  border-radius: var(--cd-radius-sm);
}
.config figcaption {
  display: flex;
  justify-content: space-between;
  padding: 7px 16px;
  border-bottom: var(--line);
  font: 400 12.5px/1.4 var(--vp-font-family-mono);
}
.config pre {
  margin: 0;
  padding: clamp(8px, 1.4vh, 14px) 18px;
  font: 400 13.5px/1.55 var(--vp-font-family-mono);
}
.config .key {
  color: var(--cd-ui-link);
}
.config strong {
  font-weight: 600;
}
.quiet {
  color: var(--cd-ui-text-leise);
}

.install {
  margin-top: clamp(10px, 1.6vh, 16px);
  border: var(--line);
  border-radius: var(--cd-radius-sm);
  background: var(--cd-ui-abschnitt);
}
.tabs {
  display: flex;
  border-bottom: var(--line);
}
.tab {
  position: relative;
  padding: 9px 14px;
  border-right: var(--line);
  font: 500 13px/1 var(--vp-font-family-mono);
  color: var(--cd-ui-text-leise);
}
.tab[aria-selected='true'] {
  color: var(--cd-ui-text);
  background: var(--cd-ui-seite);
}
.tab[aria-selected='true']::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--cd-ui-interaktion);
  transform-origin: left;
}
.cycling .tab[aria-selected='true']::after {
  animation: fill 6s linear;
}
@keyframes fill {
  from {
    transform: scaleX(0);
  }
}
.pause {
  margin-left: auto;
  padding: 0 14px;
  font: 500 12px/1 var(--vp-font-family-mono);
  color: var(--cd-ui-text-leise);
}
.command {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 8px 8px 16px;
}
.channels {
  display: grid;
  flex: 1;
  min-width: 0;
  align-self: center;
}
.command pre {
  grid-area: 1 / 1;
  margin: 0;
  font: 400 13.5px/1.6 var(--vp-font-family-mono);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.command pre.hidden {
  visibility: hidden;
}
.prompt {
  color: var(--cd-ui-text-leise);
  user-select: none;
}
.copy {
  flex: none;
  height: 32px;
  padding: 0 10px;
  border: var(--line);
  border-radius: var(--cd-radius-sm);
  font: 500 12px/1 var(--vp-font-family-mono);
  color: var(--cd-ui-text);
}
.copy:hover {
  background: var(--cd-ui-hover);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 20px;
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--cd-ui-text-leise);
}
.meta > span:first-child {
  font: 400 12px/1.5 var(--vp-font-family-mono);
}
.pre-release {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--cd-ui-text);
}
.pre-release strong {
  font: 500 12px/1 var(--vp-font-family-mono);
}
.marker {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--cd-ui-warning);
}
.start {
  align-self: flex-start;
  margin-top: clamp(10px, 2vh, 24px);
  font-weight: 600;
  color: var(--cd-ui-link);
  text-decoration: none;
}
.start:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.stage {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(14px, 2.4vh, 32px);
  padding: clamp(16px, 3vh, 48px) var(--gutter);
  background: var(--cd-ui-abschnitt);
}
.place {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}
.caption {
  color: inherit;
  text-decoration: none;
}
.number {
  display: block;
  margin-bottom: 4px;
  font: 500 12px/1 var(--vp-font-family-mono);
  color: var(--cd-ui-link);
}
.caption h2 {
  margin: 0;
  padding: 0;
  border: 0;
  font-size: 20px;
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.go {
  font: 500 15px/1 var(--vp-font-family-mono);
  color: var(--cd-ui-text-leise);
}
.caption:hover h2 {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-decoration-color: var(--cd-ui-interaktion);
  text-underline-offset: 5px;
}
.caption p {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--cd-ui-text-leise);
}

.window {
  width: 100%;
  border: 1px solid var(--cd-ui-kontur);
  border-radius: 10px;
  overflow: hidden;
  background: var(--cd-ui-flaeche-hoch);
}
.titlebar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 34px;
  padding: 0 14px;
  border-bottom: var(--line);
  background: var(--cd-ui-abschnitt);
  font: 400 12px/1 var(--vp-font-family-mono);
  color: var(--cd-ui-text-leise);
}
.dots {
  display: flex;
  gap: 6px;
}
.dots i {
  width: 10px;
  height: 10px;
  border: 1px solid var(--cd-ui-kontur);
  border-radius: 50%;
}
.titlebar .name {
  color: var(--cd-ui-text);
}
.titlebar .right {
  margin-left: auto;
}

.canvas {
  position: relative;
  background: var(--cd-ui-plot);
}
.canvas img {
  display: block;
  width: 100%;
}
.badge {
  position: absolute;
  top: 12%;
  left: 69.2%;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--cd-ui-danger);
  color: var(--cd-ui-flaeche);
  font: 600 11px/1 var(--vp-font-family-mono);
  transform: translate(-50%, -50%);
}
.hint {
  position: absolute;
  top: 69.3%;
  right: 3%;
  padding: 4px 9px;
  white-space: nowrap;
  border: var(--line);
  border-radius: 6px;
  background: var(--cd-ui-flaeche);
  color: var(--cd-ui-text);
  font-size: 12px;
  line-height: 1.4;
}
.hint code {
  margin-left: 6px;
  font-size: 11px;
  color: var(--cd-ui-text-leise);
}

.check {
  padding: 10px 16px 12px;
  font-size: 13px;
}
.failed {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-weight: 600;
}
.failed::before {
  content: '';
  width: 12px;
  height: 12px;
  border: 2px solid var(--cd-ui-danger);
  border-radius: 50%;
}
.annotation,
.session {
  display: flex;
  flex-direction: column;
  font: 400 12px/1.55 var(--vp-font-family-mono);
}
.annotation {
  padding: 7px 12px;
  border: var(--line);
  border-left: 3px solid var(--cd-ui-danger);
  border-radius: 4px;
}
.session {
  padding: 10px 16px 12px;
  font-size: 12.5px;
  line-height: 1.65;
}
.clean::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  background: var(--cd-ui-success);
}

@media (min-width: 960px) {
  .landing {
    display: flex;
    min-height: calc(100dvh - var(--vp-nav-height) - 53px);
  }
  .frame {
    flex: 1;
    grid-template-columns: 5fr 7fr;
  }
  .pitch {
    padding-right: 48px;
    border-right: var(--line);
    border-bottom: 0;
  }
}

@media (min-width: 1200px) {
  .place {
    grid-template-columns: 210px minmax(0, 1fr);
    gap: 28px;
    align-items: center;
  }
  .place:nth-child(2) {
    grid-template-columns: minmax(0, 1fr) 210px;
  }
  .place:nth-child(2) .caption {
    order: 2;
  }
  .place:nth-child(2) .window {
    max-width: 92%;
  }
  .place:nth-child(odd) .window {
    max-width: 92%;
    justify-self: end;
  }
}

@media (max-width: 640px) {
  .landing {
    --gutter: 20px;
  }
  .command {
    flex-direction: column;
    gap: 10px;
  }
  .channels {
    width: 100%;
  }
  .command pre {
    font-size: 12px;
  }
  .copy {
    align-self: flex-end;
  }
  .hint {
    display: none;
  }
}
</style>
