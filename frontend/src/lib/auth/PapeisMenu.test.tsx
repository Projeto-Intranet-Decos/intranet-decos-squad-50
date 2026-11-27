import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { simularConsultasDeMidia, tokenDeAcessoFalso } from '../../testes/apoio'
import { marcarIntroducaoVista } from '../introducao/useIntroducao'
import { entrarComToken } from './useAuth'

vi.mock('../../features/atalhos/api', async (original) => ({
  ...(await original<typeof import('../../features/atalhos/api')>()),
  listarAtalhos: vi.fn(async () => []),
}))

vi.mock('../../features/murais/api', async (original) => ({
  ...(await original<typeof import('../../features/murais/api')>()),
  listarAvisos: vi.fn(async () => []),
}))

function entrarComo(role: string) {
  entrarComToken(tokenDeAcessoFalso({ sub: 'u1', nome: 'Pessoa', role, setor_id: null }))
}

function montar(rota: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[rota]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('USU-09 — menu e rotas por papel', () => {
  beforeEach(() => {
    localStorage.clear()
    marcarIntroducaoVista('u1')
    simularConsultasDeMidia((consulta) => consulta.includes('min-width: 1024px'))
  })

  it('rh vê Usuários, mas não o Registro de Atividades', () => {
    entrarComo('rh')
    montar('/mural')

    expect(screen.getByRole('link', { name: 'Usuários' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Registro de Atividades' })).toBeNull()
  })

  it('marketing não vê a seção de Administração', () => {
    entrarComo('marketing')
    montar('/mural')

    expect(screen.queryByRole('link', { name: 'Usuários' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Registro de Atividades' })).toBeNull()
  })

  it('superadmin vê os dois', () => {
    entrarComo('superadmin')
    montar('/mural')

    expect(screen.getByRole('link', { name: 'Usuários' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Registro de Atividades' })).toBeTruthy()
  })

  it('rh abrindo /logs vai para não autorizado', () => {
    entrarComo('rh')
    montar('/logs')

    expect(screen.getByRole('heading', { name: 'Acesso não autorizado' })).toBeTruthy()
  })

  it('marketing e "Novo aviso": o botão aparece no mural', async () => {
    entrarComo('marketing')
    montar('/mural')

    expect(await screen.findByRole('button', { name: /novo aviso/i })).toBeTruthy()
  })

  it('rh não vê "Novo aviso"', async () => {
    entrarComo('rh')
    montar('/mural')

    expect(await screen.findByRole('link', { name: 'Usuários' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /novo aviso/i })).toBeNull()
  })
})
