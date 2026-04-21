import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'main',
      include: ['tests/main/**/*.test.ts'],
      environment: 'node',
    }
  },
  {
    test: {
      name: 'renderer',
      include: ['tests/renderer/**/*.test.tsx'],
      environment: 'jsdom',
      setupFiles: ['tests/renderer/setup.ts'],
      globals: true,
    }
  }
])
