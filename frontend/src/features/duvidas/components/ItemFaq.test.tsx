import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { definirPreferencias, iniciarPreferencias } from '../../../lib/preferencias/preferencias'
import { simularConsultasDeMidia } from '../../../testes/apoio'
import type { Faq } from '../types'
import ItemFaq from './ItemFaq'

const faq: Faq = {
  id: '1',
  pergunta: 'Como solicito férias?',
  resposta: 'Pelo portal do RH, com 30 dias de antecedência.',
  setorId: 's1',
  setorNome: 'RH',
  criadoEm: '2026-10-01T10:00:00Z',
  atualizadoEm: null,
}

function montar(expandido: boolean) {
  const aoAlternar = vi.fn()
  render(
    <ItemFaq
      faq={faq}
      expandido={expandido}
      aoAlternar={aoAlternar}
      podeGerenciar={false}
      aoEditar={vi.fn()}
      aoExcluir={vi.fn()}
    />,
  )
  return aoAlternar
}

describe('DUV-06 — animação ao abrir uma FAQ', () => {
  it('a resposta não aparece fechada e aparece ao abrir', async () => {
    iniciarPreferencias()
    const { rerender } = render(
      <ItemFaq faq={faq} expandido={false} aoAlternar={vi.fn()} podeGerenciar={false} aoEditar={vi.fn()} aoExcluir={vi.fn()} />,
    )
    expect(screen.queryByText(faq.resposta)).toBeNull()

    rerender(
      <ItemFaq faq={faq} expandido aoAlternar={vi.fn()} podeGerenciar={false} aoEditar={vi.fn()} aoExcluir={vi.fn()} />,
    )
    await waitFor(() => expect(screen.getByText(faq.resposta)).toBeTruthy())
  })

  it('com animações reduzidas, fechar esconde a resposta na hora', () => {
    definirPreferencias({ reduzirAnimacoes: true })
    const { rerender } = render(
      <ItemFaq faq={faq} expandido aoAlternar={vi.fn()} podeGerenciar={false} aoEditar={vi.fn()} aoExcluir={vi.fn()} />,
    )
    expect(screen.getByText(faq.resposta)).toBeTruthy()

    rerender(
      <ItemFaq faq={faq} expandido={false} aoAlternar={vi.fn()} podeGerenciar={false} aoEditar={vi.fn()} aoExcluir={vi.fn()} />,
    )
    expect(screen.queryByText(faq.resposta)).toBeNull()
  })

  it('com prefers-reduced-motion, fechar esconde a resposta na hora', () => {
    simularConsultasDeMidia(() => true)
    const { rerender } = render(
      <ItemFaq faq={faq} expandido aoAlternar={vi.fn()} podeGerenciar={false} aoEditar={vi.fn()} aoExcluir={vi.fn()} />,
    )
    expect(screen.getByText(faq.resposta)).toBeTruthy()

    rerender(
      <ItemFaq faq={faq} expandido={false} aoAlternar={vi.fn()} podeGerenciar={false} aoEditar={vi.fn()} aoExcluir={vi.fn()} />,
    )
    expect(screen.queryByText(faq.resposta)).toBeNull()
  })

  it('clicar no cabeçalho chama aoAlternar', () => {
    const aoAlternar = montar(false)
    fireEvent.click(screen.getByRole('button', { name: /Como solicito férias/ }))
    expect(aoAlternar).toHaveBeenCalledOnce()
  })
})
