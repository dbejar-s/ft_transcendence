import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'security-tests',
    globals: true,
    environment: 'node',
    setupFiles: ['./test/security/setup.ts'],
    include: ['./test/security/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.d.ts',
      ],
    },
    timeout: 30000,
  },
});
