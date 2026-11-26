// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import * as api from '../api'
import type { Documento, VersaoDocumento } from '../types'
import ModalHistoricoVersoes from './ModalHistoricoVersoes'
import LinhaDocumento from './LinhaDocumento'

const documento: Documento = {
  id: 'd1',
  titulo: 'Punção venosa periférica',
  descricao: null,
  categoria: 'pop',
  setorId: 's1',
  setorNome: 'Enfermagem',
  nomeArquivo: 'puncao.pdf',
  tipoConteudo: 'application/pdf',
  tamanhoBytes: 2048,
  autorId: 'u1',
  autorNome: 'Marina',
  criadoEm: '2026-10-01T10:00:00Z',
  atualizadoEm: '2026-11-01T10:00:00Z',
  versao: 2,
}

const versoes: VersaoDocumento[] = [
  { numero: 2, nomeArquivo: 'puncao.pdf', tipoConteudo: 'application/pdf', tamanhoBytes: 2048, alteracao: 'Inclusão de checklist', autorId: 'u1', autorNome: 'Marina', criadoEm: '2026-11-01T10:00:00Z' },
  { numero: 1, nomeArquivo: 'puncao-antigo.pdf', tipoConteudo: 'application/pdf', tamanhoBytes: 1024, alteracao: null, autorId: 'u1', autorNome: 'Marina', criadoEm: '2026-10-01T10:00:00Z' },
]

function montar() {
  vi.spyOn(api, 'listarVersoes').mockResolvedValue(versoes)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ModalHistoricoVersoes documento={documento} aoFechar={vi.fn()} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('DOC-09 — histórico de versões', () => {
  it('lista as versões da mais nova para a mais antiga, marcando a atual e mostrando a nota', async () => {
    montar()

    expect(await screen.findByText('Versão 2')).toBeTruthy()
    expect(screen.getByText('Versão 1')).toBeTruthy()
    expect(screen.getAllByText('Atual')).toHaveLength(1)
    expect(screen.getByText('Inclusão de checklist')).toBeTruthy()
    expect(screen.getByText(/puncao-antigo\.pdf/)).toBeTruthy()
  })

  it('baixa uma versão antiga', async () => {
    const baixar = vi.spyOn(api, 'baixarVersaoArquivo').mockResolvedValue(new Blob(['x']))
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    montar()

    fireEvent.click(await screen.findByRole('button', { name: 'Baixar versão 1' }))

    await vi.waitFor(() => expect(baixar).toHaveBeenCalledWith('d1', 1))
  })

  it('a linha mostra o selo da versão atual e abre o histórico', () => {
    const aoVerHistorico = vi.fn()
    render(
      <ul>
        <LinhaDocumento
          documento={documento}
          podeGerenciar={false}
          aoVisualizar={vi.fn()}
          aoBaixar={vi.fn()}
          aoEditar={vi.fn()}
          aoExcluir={vi.fn()}
          aoVerHistorico={aoVerHistorico}
        />
      </ul>,
    )

    fireEvent.click(screen.getByRole('button', { name: /versão 2: ver histórico/i }))

    expect(aoVerHistorico).toHaveBeenCalled()
  })
})
