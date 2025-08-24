/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Make describe, it, expect, etc. available globally
    environment: 'jsdom', // Use jsdom environment for React components
    setupFiles: './src/setupTests.ts', // Point to setup file
    // Remove server.deps configuration as vitest-chrome is not used
    // server: {
    //   deps: {
    //     inline: ['vitest-chrome'],
    //   },
    // },
    // Optionally, you can configure coverage here
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
    },
  },
}); 