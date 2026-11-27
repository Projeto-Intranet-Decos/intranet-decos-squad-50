import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Documento } from '../types'
import PaginaDocumentos from './PaginaDocumentos'

const documentos: Documento[] = [
  {
    id: 'd1', titulo: 'Manual da bomba de infusão', descricao: null, categoria: 'manual', setorId: 's1',
    setorNome: 'Enfermagem', nomeArquivo: 'manual.docx', tipoConteudo: 'application/msword',
    tamanhoBytes: 10, autorId: 'u1', autorNome: 'Paulo', criadoEm: '2026-11-26T10:00:00Z',
    atualizadoEm: null, versao: 1, versaoAutorId: 'u1', versaoCriadaEm: '2026-11-26T10:00:00Z',
  },
  {
    id: 'd2', titulo: 'POP de curativo', descricao: null, categoria: 'pop', setorId: 's1',
    setorNome: 'Enfermagem', nomeArquivo: 'pop.docx', tipoConteudo: 'application/msword',
    tamanhoBytes: 10, autorId: 'u1', autorNome: 'Paulo', criadoEm: '2026-11-25T10:00:00Z',
    atualizadoEm: null, versao: 1, versaoAutorId: 'u1', versaoCriadaEm: '2026-11-25T10:00:00Z',
  },
]

// Como o backend: a categoria filtra a lista.
vi.mock('../api', async (original) => ({
  ...(await original<typeof import('../api')>()),
  listarDocumentos: vi.fn(async ({ categoria }: { categoria?: string } = {}) =>
    documentos.filter((d) => !categoria || d.categoria === categoria),
  ),
  buscarDocumento: vi.fn(async (id: string) => {
    const documento = documentos.find((d) => d.id === id)
    if (!documento) throw new Error('404')
    return documento
  }),
  listarSetores: vi.fn(async () => []),
}))

function montar(endereco: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[endereco]}>
        <PaginaDocumentos />
        {/* Faz o papel do sino: navega para a mesma página, já montada. */}
        <Link to="/documentos?documento=d2">Abrir POP de curativo</Link>
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

  it('abre o documento mesmo com um filtro ativo que o esconde da lista', async () => {
    montar('/documentos')
    await screen.findAllByText('POP de curativo')
    // O primeiro "Categoria" é o filtro; o segundo, o cabeçalho que ordena a tabela.
    fireEvent.click(screen.getAllByRole('button', { name: 'Categoria' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Manual' }))
    await waitFor(() => expect(screen.queryAllByText('POP de curativo')).toHaveLength(0))

    fireEvent.click(screen.getByRole('link', { name: 'Abrir POP de curativo' }))

    expect(await screen.findByRole('dialog', { name: 'POP de curativo' })).toBeTruthy()
  })
})
