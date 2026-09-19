<script setup lang="ts">
import { withBase } from 'vitepress';

import GithubIcon from '../icons/GithubIcon.vue';
import LinkedInIcon from '../icons/LinkedInIcon.vue';

const GITHUB_URL = 'https://github.com/Miragon/bpmnlint-rules';
const LINKEDIN_URL = 'https://www.linkedin.com/company/miragon-io';
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer-inner">
      <div class="site-footer-brand">
        <img :src="withBase('/miragon-favicon.png')" alt="Miragon" />
        <span>© 2026 Miragon GmbH · MIT</span>
      </div>
      <div class="site-footer-links">
        <a href="https://www.miragon.io/impressum" target="_blank" rel="noopener">Legal Notice</a>
        <span class="sep">·</span>
        <a href="https://www.miragon.io/datenschutz" target="_blank" rel="noopener"
          >Privacy Policy</a
        >
        <span class="sep">·</span>
        <a href="https://www.miragon.io" target="_blank" rel="noopener">miragon.io</a>
        <a
          class="site-footer-social"
          :href="GITHUB_URL"
          target="_blank"
          rel="noopener"
          aria-label="GitHub"
        >
          <GithubIcon />
        </a>
        <a
          class="site-footer-social"
          :href="LINKEDIN_URL"
          target="_blank"
          rel="noopener"
          aria-label="LinkedIn"
        >
          <LinkedInIcon />
        </a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  padding: 28px 24px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.site-footer-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  max-width: 1040px;
  margin: 0 auto;
}
.site-footer-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
.site-footer-brand img {
  display: block;
  width: 24px;
  height: 24px;
}
.site-footer-links {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
}
.site-footer-links a {
  color: var(--vp-c-text-2);
  font-weight: 500;
  text-decoration: none;
}
.site-footer-links a:hover {
  color: var(--vp-c-brand-1);
}
.sep {
  color: var(--vp-c-divider);
}
.site-footer-social {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-left: 4px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  transition: all 0.15s ease;
}
.site-footer-social:hover {
  border-color: var(--vp-c-brand-1);
}
.site-footer-social svg {
  width: 16px;
  height: 16px;
}
</style>
