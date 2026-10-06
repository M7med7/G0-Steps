import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths, so the build works under https://<user>.github.io/G0-Steps/ and locally.
  base: './',
  build: {
    target: 'es2022',
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
