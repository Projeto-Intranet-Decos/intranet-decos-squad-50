// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { marcarIntroducaoVista } from '../../lib/introducao/useIntroducao'
import { simularConsultasDeMidia } from '../../testes/apoio'

vi.mock('../atalhos/api', async (original) => ({
  ...(await original<typeof import('../atalhos/api')>()),
  listarAtalhos: vi.fn(async () => []),
}))

function montar(rota: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[rota]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AUT-10 — visitante não vê documentos', () => {
  beforeEach(() => {
    localStorage.clear()
    marcarIntroducaoVista(null)
    simularConsultasDeMidia((consulta) => consulta.includes('min-width: 1024px'))
  })
  afterEach(() => localStorage.clear())

  it('o menu não tem "POPs & documentos"', () => {
    montar('/mural')

    expect(screen.getByRole('link', { name: 'Mural de avisos' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'POPs & documentos' })).toBeNull()
  })

  it('abrir /documentos leva ao login', () => {
    montar('/documentos')

    expect(screen.queryByRole('heading', { name: /POPs/ })).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toMatch(/POPs/)
    expect(screen.getByLabelText(/senha/i)).toBeTruthy()
  })
})
