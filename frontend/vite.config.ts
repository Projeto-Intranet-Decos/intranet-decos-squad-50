import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Prefixo vazio: API_URL só serve ao proxy e não vai para o bundle (só VITE_* iria).
  const ambiente = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'jsdom',
      setupFiles: './src/testes/preparacao.ts',
      // Só o index.css é carregado, para os testes que conferem o vidro no próprio CSS (`?raw`).
      css: { include: /index\.css/ },
    },
    server: {
      // Em dev, espelha o nginx de produção: /api vai pro backend (API_URL) sem o prefixo.
      proxy: {
        '/api': {
          target: ambiente.API_URL || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (caminho) => caminho.replace(/^\/api/, ''),
        },
      },
    },
  }
})
