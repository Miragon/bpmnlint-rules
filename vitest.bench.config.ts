import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/bench/**/*.bench.ts'],
    silent: false,
    testTimeout: 300_000,
    hookTimeout: 60_000,
  },
});
