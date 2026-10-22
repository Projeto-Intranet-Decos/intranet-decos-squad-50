import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Aviso } from '../types'
import PaginaMural from './PaginaMural'

const avisos: Aviso[] = [
  {
    id: 'a1', titulo: 'Comunicado da diretoria', conteudo: 'texto', urlImagem: null,
    categoria: 'comunicado', dataInicio: null, dataFim: null, fixado: false,
    autorId: 'u1', autorNome: 'Marina', setorId: 's1', setorNome: 'Enfermagem',
    anexos: [], criadoEm: '2026-10-10T10:00:00Z', atualizadoEm: null,
  },
  {
    id: 'a2', titulo: 'Promoção de aniversário', conteudo: 'texto', urlImagem: null,
    categoria: 'promocao', dataInicio: null, dataFim: null, fixado: false,
    autorId: 'u1', autorNome: 'Marina', setorId: 's1', setorNome: 'Enfermagem',
    anexos: [], criadoEm: '2026-10-09T10:00:00Z', atualizadoEm: null,
  },
]

vi.mock('../api', async (original) => ({
  ...(await original<typeof import('../api')>()),
  listarAvisos: vi.fn(async () => avisos),
  listarSetores: vi.fn(async () => []),
  listarEventos: vi.fn(async () => []),
  listarAniversariantes: vi.fn(async () => []),
}))

function montar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <PaginaMural />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MUR-11 — animação da lista reinicia ao filtrar', () => {
  it('o card remonta (reanima) quando a busca muda', async () => {
    montar()
    // h3: título do card na lista (o h2 é do carrossel de destaques, mesmo texto).
    const cardAntes = await screen.findByRole('heading', { level: 3, name: 'Comunicado da diretoria' })

    fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: 'Comunicado' } })

    const cardDepois = screen.getByRole('heading', { level: 3, name: 'Comunicado da diretoria' })
    expect(cardDepois).not.toBe(cardAntes)
  })
})

describe('MUR-11 — filtro por data de publicação', () => {
  it('restringe a lista ao período entre "de" e "até", inclusive', async () => {
    montar()
    await screen.findByRole('heading', { level: 3, name: 'Comunicado da diretoria' })
    expect(screen.getByRole('heading', { level: 3, name: 'Promoção de aniversário' })).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Publicado a partir de'), { target: { value: '2026-10-10' } })
    fireEvent.change(screen.getByLabelText('Publicado até'), { target: { value: '2026-10-10' } })

    expect(screen.getByRole('heading', { level: 3, name: 'Comunicado da diretoria' })).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 3, name: 'Promoção de aniversário' })).toBeNull()
  })
})
