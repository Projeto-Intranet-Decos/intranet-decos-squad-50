import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import ConfiguracaoDeMovimento from './lib/preferencias/ConfiguracaoDeMovimento'
import { iniciarPreferencias } from './lib/preferencias/preferencias'

const clienteDeConsultas = new QueryClient()

// Antes do primeiro render, para a página não piscar com o visual padrão.
iniciarPreferencias()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={clienteDeConsultas}>
      <BrowserRouter>
        <ConfiguracaoDeMovimento>
          <App />
        </ConfiguracaoDeMovimento>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
