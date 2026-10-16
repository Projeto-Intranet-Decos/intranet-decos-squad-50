import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Aviso } from '../types'
import ModalDetalheAviso from './ModalDetalheAviso'

function aviso(dados: Partial<Aviso> = {}): Aviso {
  return {
    id: 'a1',
    titulo: 'Treinamento de exemplo',
    conteudo: null,
    urlImagem: null,
    categoria: 'evento',
    dataInicio: new Date(2026, 9, 17, 10, 0).toISOString(),
    dataFim: null,
    fixado: false,
    autorId: 'u1',
    autorNome: 'Admin Enfermagem',
    setorId: 's1',
    setorNome: 'Enfermagem',
    anexos: [],
    criadoEm: new Date(2026, 9, 9).toISOString(),
    atualizadoEm: null,
    ...dados,
  }
}

function EnderecoAtual() {
  const { pathname, search } = useLocation()
  return <p>Endereço: {pathname + search}</p>
}

function montar(detalhe: Aviso) {
  const aoFechar = vi.fn()
  render(
    <MemoryRouter initialEntries={['/mural']}>
      <Routes>
        <Route path="/mural" element={<ModalDetalheAviso aviso={detalhe} aoFechar={aoFechar} />} />
        <Route path="/calendario" element={<EnderecoAtual />} />
      </Routes>
    </MemoryRouter>,
  )
  return aoFechar
}

describe('MUR-15 — "Ver no calendário" no detalhe do evento', () => {
  it('fecha o detalhe e abre o calendário na data de início do evento', () => {
    const aoFechar = montar(aviso())

    fireEvent.click(screen.getByRole('button', { name: 'Ver no calendário' }))

    expect(aoFechar).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Endereço: /calendario?data=2026-10-17')).toBeTruthy()
  })

  it('não aparece em aviso que não é evento', () => {
    montar(aviso({ categoria: 'comunicado', dataInicio: null }))

    expect(screen.queryByRole('button', { name: 'Ver no calendário' })).toBeNull()
  })
})
