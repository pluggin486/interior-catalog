import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { include: ['apps/api/src/**/*.integration.test.ts'], testTimeout: 15000, hookTimeout: 30000 },
})
