import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Layout from '../../shared/components/Layout'
import { simularConsultasDeMidia, tokenDeAcessoFalso } from '../../testes/apoio'
import { marcarIntroducaoVista } from './useIntroducao'

vi.mock('../../features/atalhos/api', async (original) => ({
  ...(await original<typeof import('../../features/atalhos/api')>()),
  listarAtalhos: vi.fn(async () => []),
}))

function entrarComo(id: string, nome: string) {
  localStorage.setItem('intranet:token', tokenDeAcessoFalso({ sub: id, nome, role: 'comum', setor_id: 's1' }))
}

function montar() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/mural']}>
        <Layout>
          <p>Página do mural</p>
        </Layout>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function introducao() {
  return screen.queryByRole('dialog')
}

function proximo() {
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
}

beforeEach(() => {
  simularConsultasDeMidia((consulta) => consulta.includes('min-width: 1024px'))
})

describe('GER-23 — introdução', () => {
  it('aparece na primeira visita, começando pelas boas-vindas', () => {
    entrarComo('u1', 'Carla Mendes')
    montar()

    expect(screen.getByRole('dialog', { name: 'Olá, Carla!' })).toBeTruthy()
    expect(screen.getByText('1 de 8')).toBeTruthy()
  })

  it('o visitante vê a versão de visitante', () => {
    montar()

    expect(screen.getByRole('dialog', { name: 'Boas-vindas à intranet' })).toBeTruthy()
  })

  it('Próximo destaca o item do menu, Anterior volta e o último passo vira Concluir', async () => {
    entrarComo('u1', 'Carla Mendes')
    montar()

    proximo()
    expect(screen.getByRole('dialog', { name: 'Mural de avisos' })).toBeTruthy()
    expect(await screen.findByTestId('destaque-introducao')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(screen.getByRole('dialog', { name: 'Olá, Carla!' })).toBeTruthy()

    for (let passo = 1; passo < 8; passo++) proximo()
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }))
    expect(introducao()).toBeNull()
  })

  it('depois de pular não aparece de novo, mas outro usuário no mesmo navegador ainda vê a sua', () => {
    entrarComo('u1', 'Carla Mendes')
    const primeira = montar()
    fireEvent.click(screen.getByRole('button', { name: 'Pular' }))
    expect(introducao()).toBeNull()
    primeira.unmount()

    const segunda = montar()
    expect(introducao()).toBeNull()
    segunda.unmount()

    entrarComo('u2', 'Roberto Souza')
    montar()
    expect(screen.getByRole('dialog', { name: 'Olá, Roberto!' })).toBeTruthy()
  })

  it('Esc pula a introdução', () => {
    entrarComo('u1', 'Carla Mendes')
    montar()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(introducao()).toBeNull()
    expect(localStorage.getItem('intranet:introducao:u1')).not.toBeNull()
  })

  it('"Ver introdução" recomeça do início mesmo já vista', () => {
    entrarComo('u1', 'Carla Mendes')
    marcarIntroducaoVista('u1')
    montar()
    expect(introducao()).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Ver introdução' }))

    expect(screen.getByRole('dialog', { name: 'Olá, Carla!' })).toBeTruthy()
  })

  it('abaixo de 1024px os passos aparecem sem destaque', async () => {
    simularConsultasDeMidia(() => false)
    entrarComo('u1', 'Carla Mendes')
    montar()

    proximo()
    await act(() => new Promise((pronto) => requestAnimationFrame(pronto)))

    expect(screen.getByRole('dialog', { name: 'Mural de avisos' })).toBeTruthy()
    expect(screen.queryByTestId('destaque-introducao')).toBeNull()
  })

  it('com o localStorage bloqueado, depois de pular não volta enquanto a página está aberta', () => {
    entrarComo('u1', 'Carla Mendes')
    const bloqueio = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    montar()

    fireEvent.click(screen.getByRole('button', { name: 'Pular' }))

    expect(introducao()).toBeNull()
    bloqueio.mockRestore()
  })
})
