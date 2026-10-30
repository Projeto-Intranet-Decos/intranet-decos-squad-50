import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { erroDaApi, tokenDeAcessoFalso } from '../../testes/apoio'
import * as authApi from './api'
import PaginaRedefinirSenha from './PaginaRedefinirSenha'
import { entrarComToken, obterToken } from './useAuth'

vi.mock('./api')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const SESSAO: authApi.SessaoNova = {
  accessToken: tokenDeAcessoFalso({ sub: 'maria', role: 'comum', setor_id: null }),
}

function Endereco() {
  const local = useLocation()
  return <p data-testid="endereco">{local.pathname + local.hash}</p>
}

function montar(hash = '#token=abc') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[`/redefinir-senha${hash}`]}>
        <Routes>
          <Route path="/redefinir-senha" element={<PaginaRedefinirSenha />} />
          <Route path="/esqueci-senha" element={<p>Pedir novo link</p>} />
          <Route path="/mural" element={<p>Mural</p>} />
        </Routes>
        <Endereco />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

async function preencherSenha(interagir: ReturnType<typeof userEvent.setup>, senha: string, confirmacao = senha) {
  await interagir.type(await screen.findByLabelText(/^NOVA SENHA$/i), senha)
  await interagir.type(screen.getByLabelText(/^CONFIRME A SENHA$/i), confirmacao)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('USU-07 — redefinir senha pelo link', () => {
  it('lê o token do fragmento, tira da URL e mostra o e-mail da conta', async () => {
    vi.mocked(authApi.verificarRedefinicao).mockResolvedValue('maria@example.com')
    montar()

    await waitFor(() => expect(authApi.verificarRedefinicao).toHaveBeenCalledWith('abc'))
    await waitFor(() => expect(screen.getByTestId('endereco').textContent).toBe('/redefinir-senha'))
    const email = await screen.findByLabelText(/^E-MAIL$/i) as HTMLInputElement
    expect(email.value).toBe('maria@example.com')
    expect(email.readOnly).toBe(true)
  })

  it('link inválido leva a pedir um link novo', async () => {
    vi.mocked(authApi.verificarRedefinicao).mockRejectedValue(erroDaApi(400, { mensagem: 'Link inválido ou expirado' }))
    const interagir = montar()

    expect(await screen.findByText(/Link inválido ou expirado/)).toBeTruthy()
    await interagir.click(screen.getByRole('link', { name: 'Pedir um novo link' }))
    expect(screen.getByText('Pedir novo link')).toBeTruthy()
  })

  it('sem token mostra o link como inválido, sem chamar a API', async () => {
    montar('')

    expect(await screen.findByText(/Link inválido ou expirado/)).toBeTruthy()
    expect(authApi.verificarRedefinicao).not.toHaveBeenCalled()
  })

  it('não envia com senhas diferentes', async () => {
    vi.mocked(authApi.verificarRedefinicao).mockResolvedValue('maria@example.com')
    const interagir = montar()

    await preencherSenha(interagir, 'senha-nova-123', 'outra-senha-123')
    await interagir.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByText('As senhas não conferem.')).toBeTruthy()
    expect(authApi.confirmarRedefinicao).not.toHaveBeenCalled()
  })

  it('salva a senha, troca a sessão do navegador e entra no mural', async () => {
    entrarComToken(tokenDeAcessoFalso({ sub: 'outra-pessoa', role: 'superadmin', setor_id: null }))
    vi.mocked(authApi.verificarRedefinicao).mockResolvedValue('maria@example.com')
    vi.mocked(authApi.confirmarRedefinicao).mockResolvedValue(SESSAO)
    const interagir = montar()

    await preencherSenha(interagir, 'senha-nova-123')
    await interagir.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByText('Mural')).toBeTruthy()
    expect(authApi.confirmarRedefinicao).toHaveBeenCalledWith({ token: 'abc', senha: 'senha-nova-123' })
    expect(obterToken()).toBe(SESSAO.accessToken)
    expect(localStorage.getItem('intranet:sessao')).not.toBeNull()
  })

  it('link que expirou antes do envio mostra o aviso', async () => {
    vi.mocked(authApi.verificarRedefinicao).mockResolvedValue('maria@example.com')
    vi.mocked(authApi.confirmarRedefinicao).mockRejectedValue(erroDaApi(400, { mensagem: 'Link inválido ou expirado' }))
    const interagir = montar()

    await preencherSenha(interagir, 'senha-nova-123')
    await interagir.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByRole('link', { name: 'Pedir um novo link' })).toBeTruthy()
  })

  it('erro de campo do backend vai para o campo e para o toast', async () => {
    vi.mocked(authApi.verificarRedefinicao).mockResolvedValue('maria@example.com')
    vi.mocked(authApi.confirmarRedefinicao).mockRejectedValue(erroDaApi(422, { campo: 'senha', mensagem: 'Senha muito curta' }))
    const interagir = montar()

    await preencherSenha(interagir, 'senha-nova-123')
    await interagir.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByText('Senha muito curta')).toBeTruthy()
    expect(toast.error).toHaveBeenCalledWith('Senha muito curta')
  })
})
