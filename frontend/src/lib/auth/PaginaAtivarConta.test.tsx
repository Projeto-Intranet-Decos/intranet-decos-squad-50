import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { erroDaApi, tokenDeAcessoFalso as tokenDeAcesso } from '../../testes/apoio'
import * as authApi from './api'
import PaginaAtivarConta from './PaginaAtivarConta'

vi.mock('./api')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const CONVITE: authApi.DadosConvite = { email: 'maria@example.com', nome: 'Maria', dataNascimento: '1990-05-17' }

const SESSAO: authApi.SessaoNova = {
  accessToken: tokenDeAcesso({ sub: 'maria', role: 'comum', setor_id: null }),
  refreshToken: 'refresh-novo',
}

function Endereco() {
  const local = useLocation()
  return <p data-testid="endereco">{local.pathname + local.hash}</p>
}

function montar(hash = '#token=abc') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[`/ativar-conta${hash}`]}>
        <Routes>
          <Route path="/ativar-conta" element={<PaginaAtivarConta />} />
          <Route path="/mural" element={<p>Mural</p>} />
          <Route path="/login" element={<p>Tela de login</p>} />
        </Routes>
        <Endereco />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

async function preencherSenha(interagir: ReturnType<typeof userEvent.setup>, senha: string, confirmacao = senha) {
  await interagir.type(await screen.findByLabelText(/^SENHA$/i), senha)
  await interagir.type(screen.getByLabelText(/^CONFIRME A SENHA$/i), confirmacao)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('AUT-08 — página do magic link', () => {
  it('lê o token do fragmento e o tira da barra de endereço', async () => {
    vi.mocked(authApi.verificarConvite).mockResolvedValue(CONVITE)
    montar('#token=abc')

    await waitFor(() => expect(authApi.verificarConvite).toHaveBeenCalledWith('abc'))
    await waitFor(() => expect(screen.getByTestId('endereco').textContent).toBe('/ativar-conta'))
    expect(await screen.findByLabelText(/^NOME COMPLETO$/i)).toBeTruthy()
  })

  it('sem token mostra o link como inválido, sem chamar a API', async () => {
    montar('')

    expect(await screen.findByText(/Link inválido ou expirado/)).toBeTruthy()
    expect(authApi.verificarConvite).not.toHaveBeenCalled()
  })

  it('ao confirmar, troca a sessão que estava no navegador pela nova', async () => {
    localStorage.setItem('intranet:token', tokenDeAcesso({ sub: 'outra-pessoa', role: 'superadmin', setor_id: null }))
    localStorage.setItem('intranet:refresh_token', 'refresh-antigo')
    vi.mocked(authApi.verificarConvite).mockResolvedValue(CONVITE)
    vi.mocked(authApi.aceitarConvite).mockResolvedValue(SESSAO)
    const interagir = montar()

    await preencherSenha(interagir, 'senha-nova-123')
    await interagir.click(screen.getByRole('button', { name: 'Ativar conta' }))

    expect(await screen.findByText('Mural')).toBeTruthy()
    expect(localStorage.getItem('intranet:token')).toBe(SESSAO.accessToken)
    expect(localStorage.getItem('intranet:refresh_token')).toBe('refresh-novo')
  })
})

describe('AUT-09 — ativação de conta pelo convite', () => {
  it('link recusado pela API mostra a mensagem e o caminho para o login', async () => {
    vi.mocked(authApi.verificarConvite).mockRejectedValue(erroDaApi(400, { mensagem: 'Link inválido ou expirado' }))
    const interagir = montar()

    expect(await screen.findByText(/Link inválido ou expirado. Peça um novo convite ao administrador./)).toBeTruthy()
    await interagir.click(screen.getByRole('link', { name: 'Ir para o login' }))
    expect(screen.getByText('Tela de login')).toBeTruthy()
  })

  it('falha de rede na verificação permite tentar de novo', async () => {
    vi.mocked(authApi.verificarConvite).mockRejectedValueOnce(new Error('Network Error')).mockResolvedValue(CONVITE)
    const interagir = montar()

    await interagir.click(await screen.findByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByLabelText(/^NOME COMPLETO$/i)).toBeTruthy()
  })

  it('mostra o e-mail só para leitura e os dados do convite preenchidos', async () => {
    vi.mocked(authApi.verificarConvite).mockResolvedValue(CONVITE)
    montar()

    const email = await screen.findByLabelText(/^E-MAIL$/i) as HTMLInputElement
    expect(email.value).toBe('maria@example.com')
    expect(email.readOnly).toBe(true)
    expect((screen.getByLabelText(/^NOME COMPLETO$/i) as HTMLInputElement).value).toBe('Maria')
    expect((screen.getByLabelText(/^DATA DE NASCIMENTO$/i) as HTMLInputElement).value).toBe('1990-05-17')
  })

  it('não envia com senhas diferentes', async () => {
    vi.mocked(authApi.verificarConvite).mockResolvedValue(CONVITE)
    const interagir = montar()

    await preencherSenha(interagir, 'senha-nova-123', 'outra-senha-123')
    await interagir.click(screen.getByRole('button', { name: 'Ativar conta' }))

    expect(await screen.findByText('As senhas não conferem.')).toBeTruthy()
    expect(authApi.aceitarConvite).not.toHaveBeenCalled()
  })

  it('envia senha e dados confirmados e entra no mural', async () => {
    vi.mocked(authApi.verificarConvite).mockResolvedValue(CONVITE)
    vi.mocked(authApi.aceitarConvite).mockResolvedValue(SESSAO)
    const interagir = montar()

    const nome = await screen.findByLabelText(/^NOME COMPLETO$/i)
    await interagir.clear(nome)
    await interagir.type(nome, 'Maria Silva')
    await preencherSenha(interagir, 'senha-nova-123')
    await interagir.click(screen.getByRole('button', { name: 'Ativar conta' }))

    await waitFor(() => expect(authApi.aceitarConvite).toHaveBeenCalledWith({
      token: 'abc', nome: 'Maria Silva', senha: 'senha-nova-123', dataNascimento: '1990-05-17',
    }))
    expect(await screen.findByText('Mural')).toBeTruthy()
  })

  it('link que expirou antes do envio mostra a mensagem de link inválido', async () => {
    vi.mocked(authApi.verificarConvite).mockResolvedValue(CONVITE)
    vi.mocked(authApi.aceitarConvite).mockRejectedValue(erroDaApi(400, { mensagem: 'Link inválido ou expirado' }))
    const interagir = montar()

    await preencherSenha(interagir, 'senha-nova-123')
    await interagir.click(screen.getByRole('button', { name: 'Ativar conta' }))

    expect(await screen.findByText(/Peça um novo convite ao administrador/)).toBeTruthy()
  })

  it('erro de campo do backend vai para o campo e para o toast', async () => {
    vi.mocked(authApi.verificarConvite).mockResolvedValue(CONVITE)
    vi.mocked(authApi.aceitarConvite).mockRejectedValue(erroDaApi(422, { campo: 'senha', mensagem: 'Senha muito curta' }))
    const interagir = montar()

    await preencherSenha(interagir, 'senha-nova-123')
    await interagir.click(screen.getByRole('button', { name: 'Ativar conta' }))

    expect(await screen.findByText('Senha muito curta')).toBeTruthy()
    expect(toast.error).toHaveBeenCalledWith('Senha muito curta')
  })
})
