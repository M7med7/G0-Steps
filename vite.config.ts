import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths, so the build works under https://<user>.github.io/G0-Steps/ and locally.
  base: './',
  build: {
    target: 'es2022',
    // three.js is most of the 3D page's bundle (about 160 kB gzipped). It loads only on device.html.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      // Two pages: the screening app and the 3D view of the station.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        device: fileURLToPath(new URL('./device.html', import.meta.url)),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
