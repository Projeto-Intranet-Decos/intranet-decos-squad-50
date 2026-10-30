import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import { erroDaApi } from '../../testes/apoio'
import * as authApi from './api'
import PaginaLogin from './PaginaLogin'

vi.mock('./api')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function montar() {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<PaginaLogin />} />
          <Route path="/mural" element={<p>Mural</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

async function tentarEntrar(interagir: ReturnType<typeof userEvent.setup>) {
  await interagir.type(screen.getByLabelText('E-mail'), 'maria@hospital.com')
  await interagir.type(screen.getByLabelText('Senha'), 'senha-qualquer')
  await interagir.click(screen.getByRole('button', { name: 'Entrar' }))
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('AUT-01 — login', () => {
  it('senha errada mostra a mensagem neutra', async () => {
    vi.mocked(authApi.entrarComSenha).mockRejectedValue(
      erroDaApi(401, { mensagem: 'Email ou senha invalidos' }),
    )
    const interagir = montar()

    await tentarEntrar(interagir)

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('E-mail ou senha inválidos.'))
  })
})

describe('AUT-11 — limite de tentativas de login', () => {
  it('o 429 mostra a mensagem da API', async () => {
    const mensagem = 'Muitas tentativas. Tente de novo em alguns minutos.'
    vi.mocked(authApi.entrarComSenha).mockRejectedValue(erroDaApi(429, { mensagem }))
    const interagir = montar()

    await tentarEntrar(interagir)

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(mensagem))
    expect(screen.queryByText('Mural')).toBeNull()
  })
})
