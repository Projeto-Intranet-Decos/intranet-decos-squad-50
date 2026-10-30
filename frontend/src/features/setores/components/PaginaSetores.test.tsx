// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Papel } from '../../../lib/auth/tipos'
import * as setoresApi from '../api'
import type { SetorComRamais } from '../types'
import PaginaSetores from './PaginaSetores'

vi.mock('../../../lib/auth/useAuth', () => ({ useAuth: () => ({ usuario: estado.usuario }) }))
vi.mock('../api')
const estado = vi.hoisted(() => ({ usuario: { id: 'admin', role: 'superadmin' as Papel, setorId: null } }))

const setores: SetorComRamais[] = [
  { id: 'enf', nome: 'Enfermagem', criadoEm: '2026-10-16T10:00:00Z', ramais: [{ id: 'r1', numero: '200', setorId: 'enf' }] },
  { id: 'adm', nome: 'Administração', criadoEm: '2026-10-16T10:00:00Z', ramais: [{ id: 'r2', numero: '100', setorId: 'adm' }] },
]

function montar() {
  vi.mocked(setoresApi.listarSetores).mockResolvedValue(setores)
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={cliente}><PaginaSetores /></QueryClientProvider>)
  return userEvent.setup()
}

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('GER-21 — skeleton de carregamento', () => {
  it('mostra blocos skeleton enquanto carrega e troca pelos dados reais depois', async () => {
    let resolver: (valor: SetorComRamais[]) => void = () => {}
    vi.mocked(setoresApi.listarSetores).mockReturnValue(new Promise((resolve) => { resolver = resolve }))
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={cliente}><PaginaSetores /></QueryClientProvider>)

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
    expect(screen.queryByText('Enfermagem')).toBeNull()

    resolver(setores)
    await screen.findByText('Enfermagem')
    expect(screen.queryByTestId('skeleton')).toBeNull()
  })
})

describe('GER-20 — ordenar a tela de setores pelo cabeçalho', () => {
  it('clicar em "Setor" ordena alfabeticamente pelo nome do setor', async () => {
    const interagir = montar()
    await screen.findByText('Enfermagem')

    const nomes = () => screen.getAllByText(/Administração|Enfermagem/).map((el) => el.textContent)
    // Padrão já é nome A–Z, então a lista começa ordenada mesmo sem clicar.
    expect(nomes()).toEqual(['Administração', 'Enfermagem'])

    // Coluna "Setor" já é a ativa: clicar nela inverte pra Z–A.
    await interagir.click(screen.getByRole('button', { name: /^Setor/ }))
    expect(nomes()).toEqual(['Enfermagem', 'Administração'])

    await interagir.click(screen.getByRole('button', { name: /^Setor/ }))
    expect(nomes()).toEqual(['Administração', 'Enfermagem'])
  })
})
