import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/token_simulator/',
  plugins: [react()],
  server: {
    // Local Python FastAPI agent service for VITE_AGENT_RUNTIME=server.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 15000,
    exclude: [...configDefaults.exclude, '.worktrees/**'],
  },
})
