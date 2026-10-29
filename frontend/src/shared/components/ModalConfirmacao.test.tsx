// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModalConfirmacao from './ModalConfirmacao'

function montar(processando = false) {
  const aoConfirmar = vi.fn()
  const aoFechar = vi.fn()
  render(
    <ModalConfirmacao
      titulo="Excluir aviso"
      pergunta="Tem certeza que deseja excluir este aviso?"
      destaque="Nova escala de plantão"
      rotuloConfirmar="Excluir aviso"
      processando={processando}
      aoConfirmar={aoConfirmar}
      aoFechar={aoFechar}
    />,
  )
  return { aoConfirmar, aoFechar }
}

afterEach(cleanup)

describe('Confirmação antes de excluir', () => {
  it('mostra a pergunta e o nome do item, sem excluir sozinho', () => {
    const { aoConfirmar } = montar()

    expect(screen.getByText('Tem certeza que deseja excluir este aviso?')).toBeTruthy()
    expect(screen.getByText('Nova escala de plantão')).toBeTruthy()
    expect(aoConfirmar).not.toHaveBeenCalled()
  })

  it('só exclui quando a pessoa confirma', async () => {
    const { aoConfirmar } = montar()

    await userEvent.click(screen.getByRole('button', { name: 'Excluir aviso' }))

    expect(aoConfirmar).toHaveBeenCalledTimes(1)
  })

  it('cancelar fecha sem excluir', async () => {
    const { aoConfirmar, aoFechar } = montar()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(aoFechar).toHaveBeenCalledTimes(1)
    expect(aoConfirmar).not.toHaveBeenCalled()
  })

  it('enquanto exclui, trava os botões', () => {
    montar(true)

    expect(screen.getByRole('button', { name: 'Excluindo…' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Cancelar' }).hasAttribute('disabled')).toBe(true)
  })
})
