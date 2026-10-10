import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Modal from './Modal'

function montar() {
  const aoFechar = vi.fn()
  render(
    <Modal aberto titulo="Novo aviso" aoFechar={aoFechar}>
      <p>Conteúdo do modal</p>
    </Modal>,
  )
  return { aoFechar, painel: screen.getByRole('dialog', { name: 'Novo aviso' }) }
}

function fundoDe(painel: HTMLElement) {
  const fundo = painel.parentElement!.querySelector<HTMLElement>(':scope > [aria-hidden="true"]')
  if (!fundo) throw new Error('modal sem elemento de fundo')
  return fundo
}

describe('GER-16 — modais', () => {
  it('o painel não fica dentro do elemento que desfoca a página', () => {
    const { painel } = montar()

    for (let no = painel.parentElement; no; no = no.parentElement) {
      expect(no.className).not.toContain('backdrop-blur')
    }
    expect(fundoDe(painel).className).toContain('backdrop-blur')
    expect(painel.className).toContain('glass-modal')
  })

  it('fecha ao clicar fora do painel', () => {
    const { aoFechar, painel } = montar()

    fireEvent.click(fundoDe(painel))

    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('não fecha ao clicar dentro do painel', () => {
    const { aoFechar } = montar()

    fireEvent.click(screen.getByText('Conteúdo do modal'))

    expect(aoFechar).not.toHaveBeenCalled()
  })

  it('fecha com Esc e pelo botão Fechar', () => {
    const { aoFechar } = montar()

    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByTitle('Fechar'))

    expect(aoFechar).toHaveBeenCalledTimes(2)
  })
})
