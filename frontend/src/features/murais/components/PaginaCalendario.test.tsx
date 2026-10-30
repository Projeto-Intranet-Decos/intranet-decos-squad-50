import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { tituloDoPeriodo } from '../formatadoresCalendario'
import PaginaCalendario from './PaginaCalendario'

vi.mock('../api', async (original) => ({
  ...(await original<typeof import('../api')>()),
  listarEventos: vi.fn(async () => []),
  listarAniversariantes: vi.fn(async () => []),
  listarSetores: vi.fn(async () => []),
}))

function montar(endereco: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[endereco]}>
        <PaginaCalendario />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function celulaDoDia(dia: string) {
  return screen.getByText(dia, { selector: 'span' }).parentElement!
}

describe('MUR-15 — calendário aberto numa data', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('abre no mês da data e destaca o dia por 1s, uma vez só', () => {
    vi.useFakeTimers()
    montar('/calendario?data=2026-03-12')

    expect(screen.getByRole('heading', { level: 2, name: 'Março 2026' })).toBeTruthy()
    const celula = celulaDoDia('12')
    expect(celula.className).toContain('destaque-dia')
    expect(celulaDoDia('13').className).not.toContain('destaque-dia')

    act(() => vi.advanceTimersByTime(999))
    expect(celulaDoDia('12').className).toContain('destaque-dia')
    act(() => vi.advanceTimersByTime(1))
    expect(celulaDoDia('12').className).not.toContain('destaque-dia')
  })

  it('ignora data inválida e abre no mês atual', () => {
    montar('/calendario?data=2026-02-31')

    expect(screen.getByRole('heading', { level: 2, name: tituloDoPeriodo(new Date(), 'mes') })).toBeTruthy()
    expect(document.querySelector('.destaque-dia')).toBeNull()
  })
})
