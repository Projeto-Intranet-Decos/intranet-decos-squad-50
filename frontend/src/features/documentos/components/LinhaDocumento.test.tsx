// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
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
}

function montar(podeAbrirArquivo: boolean) {
  render(
    <ul>
      <LinhaDocumento
        documento={documento}
        podeGerenciar={false}
        podeAbrirArquivo={podeAbrirArquivo}
        aoVisualizar={vi.fn()}
        aoBaixar={vi.fn()}
        aoEditar={vi.fn()}
        aoExcluir={vi.fn()}
      />
    </ul>,
  )
}

afterEach(cleanup)

describe('AUT-10 — visitante só vê, sem abrir nem baixar o arquivo', () => {
  it('mostra o título, mas sem Visualizar nem Baixar', () => {
    montar(false)

    expect(screen.getByText('Punção venosa periférica')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /visualizar/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /baixar/i })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Punção venosa periférica' })).toBeNull()
  })

  it('usuário logado continua com Visualizar e Baixar', () => {
    montar(true)

    expect(screen.getByRole('button', { name: /visualizar/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /baixar/i })).toBeTruthy()
  })
})
