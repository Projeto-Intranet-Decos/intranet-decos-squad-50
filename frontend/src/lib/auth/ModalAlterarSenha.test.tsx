import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'sonner'
import { erroDaApi, tokenDeAcessoFalso } from '../../testes/apoio'
import * as authApi from './api'
import ModalAlterarSenha from './ModalAlterarSenha'

vi.mock('./api')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const SESSAO: authApi.SessaoNova = {
  accessToken: tokenDeAcessoFalso({ sub: 'maria', role: 'comum', setor_id: null }),
  refreshToken: 'refresh-novo',
}

function montar() {
  const aoFechar = vi.fn()
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(<QueryClientProvider client={cliente}><ModalAlterarSenha aoFechar={aoFechar} /></QueryClientProvider>)
  return { interagir: userEvent.setup(), aoFechar }
}

async function preencher(interagir: ReturnType<typeof userEvent.setup>, atual: string, nova: string, confirmacao = nova) {
  await interagir.type(screen.getByLabelText(/^SENHA ATUAL$/i), atual)
  await interagir.type(screen.getByLabelText(/^NOVA SENHA$/i), nova)
  await interagir.type(screen.getByLabelText(/^CONFIRME A NOVA SENHA$/i), confirmacao)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('USU-07 — alterar senha logado', () => {
  it('troca a senha, grava os tokens novos e fecha', async () => {
    localStorage.setItem('intranet:refresh_token', 'refresh-antigo')
    vi.mocked(authApi.trocarSenha).mockResolvedValue(SESSAO)
    const { interagir, aoFechar } = montar()

    await preencher(interagir, 'senha-atual-1', 'senha-nova-123')
    await interagir.click(screen.getByRole('button', { name: 'Alterar senha' }))

    await waitFor(() => expect(aoFechar).toHaveBeenCalled())
    expect(authApi.trocarSenha).toHaveBeenCalledWith({ senhaAtual: 'senha-atual-1', senhaNova: 'senha-nova-123' })
    expect(localStorage.getItem('intranet:token')).toBe(SESSAO.accessToken)
    expect(localStorage.getItem('intranet:refresh_token')).toBe('refresh-novo')
    expect(toast.success).toHaveBeenCalledWith('Senha alterada. As outras sessões foram encerradas.')
  })

  it('não envia com senhas diferentes', async () => {
    const { interagir } = montar()

    await preencher(interagir, 'senha-atual-1', 'senha-nova-123', 'outra-senha-123')
    await interagir.click(screen.getByRole('button', { name: 'Alterar senha' }))

    expect(await screen.findByText('As senhas não conferem.')).toBeTruthy()
    expect(authApi.trocarSenha).not.toHaveBeenCalled()
  })

  it('senha atual errada vai para o campo e o modal continua aberto', async () => {
    vi.mocked(authApi.trocarSenha).mockRejectedValue(erroDaApi(400, { campo: 'senha_atual', mensagem: 'Senha atual incorreta' }))
    const { interagir, aoFechar } = montar()

    await preencher(interagir, 'senha-errada', 'senha-nova-123')
    await interagir.click(screen.getByRole('button', { name: 'Alterar senha' }))

    expect(await screen.findByText('Senha atual incorreta')).toBeTruthy()
    expect(toast.error).toHaveBeenCalledWith('Senha atual incorreta')
    expect(aoFechar).not.toHaveBeenCalled()
  })
})
