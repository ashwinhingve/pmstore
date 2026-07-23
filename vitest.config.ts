import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/pharma/**', 'src/lib/gst.ts'],
    },
  },
  resolve: {
    // Mirror tsconfig.json's "@/*" -> "./src/*" for future test files.
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
