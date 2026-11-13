import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { iniciarSessao } from './lib/auth/sessao'
import ConfiguracaoDeMovimento from './lib/preferencias/ConfiguracaoDeMovimento'
import { iniciarPreferencias } from './lib/preferencias/preferencias'
import { IconeAlerta, IconeErro, IconeInfo, IconeSucesso } from './shared/components/icones'

const clienteDeConsultas = new QueryClient()

// Antes do primeiro render, para a página não piscar com o visual padrão.
iniciarPreferencias()

// Também antes do primeiro render: a sessão é renovada pelo cookie (AUT-04, AUT-07), e a tela já
// abre logada ou como visitante, sem passar pelo login à toa.
await iniciarSessao()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={clienteDeConsultas}>
      <BrowserRouter>
        <ConfiguracaoDeMovimento>
          <App />
        </ConfiguracaoDeMovimento>
        <Toaster
          richColors
          position="top-right"
          icons={{ success: <IconeSucesso />, info: <IconeInfo />, warning: <IconeAlerta />, error: <IconeErro /> }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
