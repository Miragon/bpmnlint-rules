<template>
  <figure class="mr-card agent-loop">
    <svg
      viewBox="0 0 720 236"
      role="img"
      aria-label="Loop: the agent edits a BPMN file, the file is linted, findings go back to the agent, a clean model is done"
    >
      <defs>
        <marker
          id="loop-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10z" class="arrow" />
        </marker>
        <marker
          id="loop-arrow-error"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10z" fill="#ef4444" />
        </marker>
        <marker
          id="loop-arrow-clean"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10z" fill="#10b981" />
        </marker>
        <linearGradient id="loop-gradient" x1="0" x2="1">
          <stop offset="0" stop-color="#335de4" />
          <stop offset="1" stop-color="#00c853" />
        </linearGradient>
      </defs>

      <path class="error-flow" d="M510 134V48H160V122" marker-end="url(#loop-arrow-error)">
        <animate
          attributeName="stroke-dashoffset"
          from="22"
          to="0"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </path>
      <rect class="error-pill" x="215" y="32" width="240" height="32" rx="16" />
      <text class="error-label" x="335" y="53">findings go back to the agent</text>

      <circle class="shape" cx="40" cy="160" r="14" />
      <text class="caption" x="40" y="200">Task</text>
      <path class="flow" d="M54 160H88" marker-end="url(#loop-arrow)" />

      <rect class="shape" x="90" y="124" width="140" height="72" rx="10" />
      <text class="title" x="160" y="156">Agent</text>
      <text class="caption" x="160" y="176">edits the .bpmn file</text>
      <path class="flow" d="M230 160H288" marker-end="url(#loop-arrow)" />

      <rect class="shape lint" x="290" y="124" width="140" height="72" rx="10" />
      <text class="title" x="360" y="156">Lint</text>
      <text class="caption mono" x="360" y="176">npx bpmnlint</text>
      <path class="flow" d="M430 160H482" marker-end="url(#loop-arrow)" />

      <path class="shape" d="M510 134l26 26-26 26-26-26z" />
      <path class="flow" d="M502 152l16 16M518 152l-16 16" />
      <text class="caption" x="510" y="212">Errors?</text>
      <text class="branch error-text" x="528" y="116">yes</text>

      <path class="clean-flow" d="M536 160H622" marker-end="url(#loop-arrow-clean)" />
      <text class="branch clean-text" x="579" y="150">no</text>
      <circle class="end" cx="640" cy="160" r="16" />
      <text class="title" x="640" y="204">Done</text>
    </svg>
  </figure>
</template>

<style scoped>
.agent-loop {
  margin: 24px 0;
  padding: 20px 24px;
  color: var(--vp-c-text-1);
}
svg {
  display: block;
  width: 100%;
  height: auto;
  font-family: var(--vp-font-family-base);
}
text {
  text-anchor: middle;
}
.shape {
  fill: var(--vp-c-bg);
  stroke: currentColor;
  stroke-width: 2;
}
.shape.lint {
  stroke: url(#loop-gradient);
  stroke-width: 3;
}
.flow {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}
.arrow {
  fill: currentColor;
}
.error-flow {
  fill: none;
  stroke: #ef4444;
  stroke-width: 2;
  stroke-dasharray: 6 5;
}
.clean-flow {
  fill: none;
  stroke: #10b981;
  stroke-width: 2;
}
.end {
  fill: rgba(16, 185, 129, 0.12);
  stroke: #10b981;
  stroke-width: 4;
}
.error-pill {
  fill: var(--vp-c-bg);
  stroke: #ef4444;
  stroke-opacity: 0.4;
}
.title {
  fill: currentColor;
  font-size: 14px;
  font-weight: 700;
}
.caption {
  fill: var(--vp-c-text-2);
  font-size: 11.5px;
}
.mono {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}
.branch {
  font-size: 12px;
  font-weight: 600;
}
.error-label,
.error-text {
  fill: #ef4444;
  font-size: 12px;
  font-weight: 600;
}
.clean-text {
  fill: #10b981;
}
</style>
