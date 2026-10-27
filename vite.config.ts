import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Porta fixa: e a origem liberada no CORS do sonda-api (sonda.cors.allowed-origins).
    // strictPort evita o Vite cair silenciosamente na 5174 e a API bloquear a chamada.
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})
