import { fileURLToPath } from 'node:url';
import { createVitestConfig } from '@portal-poc/presets/vitest';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(createVitestConfig({ environment: 'jsdom' }), {
  // build/ = Node code of vite.config.ts (dev env parsing)
  test: { include: ['build/**/*.test.ts'] },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
