import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import { erroDaApi } from '../../testes/apoio'
import * as authApi from './api'
import PaginaEsqueciSenha from './PaginaEsqueciSenha'
import PaginaLogin from './PaginaLogin'

vi.mock('./api')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const MENSAGEM = 'Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.'

function montar(rota = '/esqueci-senha') {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/login" element={<PaginaLogin />} />
          <Route path="/esqueci-senha" element={<PaginaEsqueciSenha />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('USU-07 — esqueci minha senha', () => {
  it('a tela de login leva para o pedido de redefinição', async () => {
    const interagir = montar('/login')

    await interagir.click(screen.getByRole('link', { name: 'Esqueci minha senha' }))

    expect(await screen.findByLabelText(/^E-MAIL$/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enviar link' })).toBeTruthy()
  })

  it('envia o e-mail e mostra a mensagem neutra da API', async () => {
    vi.mocked(authApi.pedirRedefinicao).mockResolvedValue(MENSAGEM)
    const interagir = montar()

    await interagir.type(screen.getByLabelText(/^E-MAIL$/i), 'maria@example.com')
    await interagir.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByText(MENSAGEM)).toBeTruthy()
    expect(authApi.pedirRedefinicao).toHaveBeenCalledWith('maria@example.com')
    expect(screen.queryByRole('button', { name: 'Enviar link' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Voltar para o login' })).toBeTruthy()
  })

  it('erro de campo do backend vai para o campo e para o toast', async () => {
    vi.mocked(authApi.pedirRedefinicao).mockRejectedValue(erroDaApi(422, { campo: 'email', mensagem: 'E-mail inválido' }))
    const interagir = montar()

    await interagir.type(screen.getByLabelText(/^E-MAIL$/i), 'maria@example.com')
    await interagir.click(screen.getByRole('button', { name: 'Enviar link' }))

    await waitFor(() => expect(screen.getByText('E-mail inválido')).toBeTruthy())
    expect(toast.error).toHaveBeenCalledWith('E-mail inválido')
  })
})
