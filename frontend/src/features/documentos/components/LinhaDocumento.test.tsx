// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Documento } from '../types'
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
  tamanhoBytes: 1024,
  autorId: 'u1',
  autorNome: 'Marina',
  criadoEm: '2026-10-01T10:00:00Z',
  atualizadoEm: null,
  versao: 1,
}

afterEach(cleanup)

describe('DOC-08 — linha do documento', () => {
  it('mostra Visualizar e Baixar, e o título abre a prévia', () => {
    const aoVisualizar = vi.fn()
    render(
      <ul>
        <LinhaDocumento
          documento={documento}
          podeGerenciar={false}
          aoVisualizar={aoVisualizar}
          aoBaixar={vi.fn()}
          aoEditar={vi.fn()}
          aoExcluir={vi.fn()}
        />
      </ul>,
    )

    expect(screen.getByRole('button', { name: /baixar/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Punção venosa periférica' }))
    expect(aoVisualizar).toHaveBeenCalled()
  })
})
