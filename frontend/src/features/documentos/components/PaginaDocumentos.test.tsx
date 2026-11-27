import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Documento } from '../types'
import PaginaDocumentos from './PaginaDocumentos'

const documentos: Documento[] = [
  {
    id: 'd1', titulo: 'Manual da bomba de infusão', descricao: null, categoria: 'manual', setorId: 's1',
    setorNome: 'Enfermagem', nomeArquivo: 'manual.docx', tipoConteudo: 'application/msword',
    tamanhoBytes: 10, autorId: 'u1', autorNome: 'Paulo', criadoEm: '2026-11-26T10:00:00Z',
    atualizadoEm: null, versao: 1,
  },
]

vi.mock('../api', async (original) => ({
  ...(await original<typeof import('../api')>()),
  listarDocumentos: vi.fn(async () => documentos),
  listarSetores: vi.fn(async () => []),
}))

function montar(endereco: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[endereco]}>
        <PaginaDocumentos />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GER-28 — documentos abertos num documento', () => {
  it('/documentos?documento=<id> abre a prévia do documento', async () => {
    montar('/documentos?documento=d1')

    expect(await screen.findByRole('dialog', { name: 'Manual da bomba de infusão' })).toBeTruthy()
  })

  it('id que não existe é ignorado', async () => {
    montar('/documentos?documento=nao-existe')

    await screen.findAllByText('Manual da bomba de infusão')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
