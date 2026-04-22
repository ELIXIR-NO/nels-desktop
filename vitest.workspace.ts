import { defineWorkspace } from 'vitest/config'
import { resolve } from 'path'

const sharedAliases = {
  '@shared': resolve(__dirname, 'src/shared'),
  '@': resolve(__dirname, 'src/renderer'),
}

export default defineWorkspace([
  {
    resolve: { alias: sharedAliases },
    test: {
      name: 'main',
      include: ['tests/main/**/*.test.ts'],
      environment: 'node',
    }
  },
  {
    resolve: { alias: sharedAliases },
    test: {
      name: 'renderer',
      include: ['tests/renderer/**/*.test.tsx'],
      environment: 'jsdom',
      setupFiles: ['tests/renderer/setup.ts'],
      globals: true,
    }
  }
])
