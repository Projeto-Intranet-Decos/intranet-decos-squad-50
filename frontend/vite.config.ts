import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/testes/preparacao.ts',
    // Só o index.css é carregado, para os testes que conferem o vidro no próprio CSS (`?raw`).
    css: { include: /index\.css/ },
  },
  server: {
    // Em dev, espelha o nginx de produção: /api vai pro backend sem o prefixo.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (caminho) => caminho.replace(/^\/api/, ''),
      },
    },
  },
})
