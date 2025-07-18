import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    coverage: {
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js']
    }
  }
});
