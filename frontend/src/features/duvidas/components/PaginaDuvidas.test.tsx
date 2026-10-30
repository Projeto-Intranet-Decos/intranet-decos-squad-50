import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Papel } from '../../../lib/auth/tipos'
import { erroDaApi } from '../../../testes/apoio'
import * as duvidasApi from '../api'
import type { Faq } from '../types'
import PaginaDuvidas from './PaginaDuvidas'

vi.mock('../../../lib/auth/useAuth', () => ({ useAuth: () => ({ usuario: estado.usuario }) }))
vi.mock('../api')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const estado = vi.hoisted(() => ({
  usuario: { id: 'u1', nome: 'Marina', role: 'superadmin' as Papel, setorId: 'rh' as string | null },
}))

const faq: Faq = {
  id: 'f1',
  pergunta: 'Como solicito férias?',
  resposta: 'Pelo formulário FORM-RH-002.',
  setorId: 'rh',
  setorNome: 'RH',
  autorId: 'u1',
  autorNome: 'Marina Alencar',
  criadoEm: '2026-10-01T10:00:00Z',
  atualizadoEm: null,
}

const setores = [
  { id: 'rh', nome: 'RH' },
  { id: 'enf', nome: 'Enfermagem' },
]

function montar(role: Papel) {
  estado.usuario = { ...estado.usuario, role }
  vi.mocked(duvidasApi.listarFaq).mockResolvedValue([faq])
  vi.mocked(duvidasApi.listarSetores).mockResolvedValue(setores)
  vi.mocked(duvidasApi.criarFaq).mockResolvedValue(faq)
  vi.mocked(duvidasApi.editarFaq).mockResolvedValue(faq)
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={cliente}>
      <PaginaDuvidas />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

async function preencherNovaDuvida(interagir: ReturnType<typeof userEvent.setup>) {
  await interagir.click(await screen.findByRole('button', { name: /Nova dúvida/ }))
  await interagir.type(screen.getByPlaceholderText(/Como solicito minhas férias/), 'Onde fica o RH?')
  await interagir.type(screen.getByPlaceholderText(/Escreva a resposta/), 'No térreo.')
}

afterEach(() => vi.clearAllMocks())

describe('DUV-06 — central de dúvidas integrada à API', () => {
  it('lista as perguntas vindas da API', async () => {
    montar('comum')
    expect(await screen.findByText('Como solicito férias?')).toBeTruthy()
  })

  it('superadmin escolhe o setor ao cadastrar', async () => {
    const interagir = montar('superadmin')
    await preencherNovaDuvida(interagir)
    await interagir.selectOptions(await screen.findByLabelText('Setor'), 'enf')
    await interagir.click(screen.getByRole('button', { name: 'Publicar pergunta' }))

    expect(duvidasApi.criarFaq).toHaveBeenCalledWith({
      pergunta: 'Onde fica o RH?',
      resposta: 'No térreo.',
      setorId: 'enf',
    })
  })

  it('admin_setor cadastra sem seletor de setor (vai para o próprio)', async () => {
    const interagir = montar('admin_setor')
    await preencherNovaDuvida(interagir)

    expect(screen.queryByLabelText('Setor')).toBeNull()
    await interagir.click(screen.getByRole('button', { name: 'Publicar pergunta' }))
    expect(duvidasApi.criarFaq).toHaveBeenCalledWith({ pergunta: 'Onde fica o RH?', resposta: 'No térreo.' })
    expect(duvidasApi.listarSetores).not.toHaveBeenCalled()
  })

  it('na edição não há seletor de setor e o PUT leva só pergunta e resposta', async () => {
    const interagir = montar('superadmin')
    await interagir.click(await screen.findByRole('button', { name: /Como solicito férias/ }))
    await interagir.click(await screen.findByRole('button', { name: /Editar/ }))

    expect(screen.queryByLabelText('Setor')).toBeNull()
    await interagir.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(duvidasApi.editarFaq).toHaveBeenCalledWith('f1', {
      pergunta: faq.pergunta,
      resposta: faq.resposta,
    })
  })

  it('erro da API aparece com a mensagem do backend', async () => {
    const interagir = montar('admin_setor')
    vi.mocked(duvidasApi.criarFaq).mockRejectedValue(erroDaApi(403, { mensagem: 'Fora do seu setor' }))
    await preencherNovaDuvida(interagir)
    await interagir.click(screen.getByRole('button', { name: 'Publicar pergunta' }))

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Fora do seu setor'))
  })
})
