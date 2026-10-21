// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import type { Papel } from '../../../lib/auth/tipos'
import * as usuariosApi from '../api'
import * as setoresApi from '../../setores/api'
import type { UsuarioCadastro } from '../types'
import PaginaUsuarios from './PaginaUsuarios'

vi.mock('../../../lib/auth/useAuth', () => ({ useAuth: () => ({ usuario: estado.usuario }) }))
vi.mock('../api')
vi.mock('../../setores/api')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }))
const estado = vi.hoisted(() => ({ usuario: { id: 'admin', role: 'superadmin' as Papel, setorId: null } }))
const pessoa: UsuarioCadastro = { id:'pessoa',nome:'Maria',email:'maria@example.com',role:'comum',setorId:null,dataNascimento:null,ativo:true,criadoEm:'2026-10-16T10:00:00Z',convitePendente:false }
const convidada: UsuarioCadastro = { ...pessoa, id:'convidada', nome:'Joana', email:'joana@example.com', convitePendente:true }

function montar(lista: UsuarioCadastro[] = [pessoa]) {
  vi.mocked(usuariosApi.listarUsuarios).mockResolvedValue(lista)
  vi.mocked(setoresApi.listarSetores).mockResolvedValue([])
  const cliente = new QueryClient({defaultOptions:{queries:{retry:false}, mutations:{retry:false}}})
  render(<QueryClientProvider client={cliente}><MemoryRouter initialEntries={['/usuarios']}><Routes><Route path="/usuarios" element={<PaginaUsuarios />} /><Route path="/nao-autorizado" element={<p>Bloqueado</p>} /></Routes></MemoryRouter></QueryClientProvider>)
  return userEvent.setup()
}

afterEach(() => { cleanup(); vi.clearAllMocks(); estado.usuario.role='superadmin' })

describe('USU-01 a USU-04 — gestão exclusiva de superadmin', () => {
  it.each(['comum','admin_setor'] as const)('USU-01: bloqueia %s antes da consulta', async papel => {
    estado.usuario.role=papel; montar()
    expect(await screen.findByText('Bloqueado')).toBeTruthy()
    expect(usuariosApi.listarUsuarios).not.toHaveBeenCalled()
  })
  it('USU-01: lista e filtra por nome sem apagar dados', async () => {
    const interagir=montar(); await screen.findByText('Maria')
    await interagir.type(screen.getByLabelText(/^BUSCAR POR NOME OU E-MAIL$/i), 'inexistente')
    expect(screen.getByText('Nenhum usuário encontrado com esses filtros.')).toBeTruthy()
    await interagir.clear(screen.getByLabelText(/^BUSCAR POR NOME OU E-MAIL$/i))
    expect(screen.getByText('Maria')).toBeTruthy()
  })
  it('USU-02: cadastra sem senha e avisa que o convite foi enviado', async () => {
    const interagir=montar(); await screen.findByText('Maria')
    vi.mocked(usuariosApi.criarUsuario).mockResolvedValue({...pessoa, convitePendente:true, emailEnviado:true})
    await waitFor(() => expect((screen.getByRole('button',{name:'Novo usuário'}) as HTMLButtonElement).disabled).toBe(false))
    await interagir.click(screen.getByRole('button',{name:'Novo usuário'}))
    expect(screen.queryByLabelText(/SENHA/i)).toBeNull()
    await interagir.type(screen.getByLabelText(/^NOME COMPLETO$/i),'Maria')
    await interagir.type(screen.getByLabelText(/^E-MAIL$/i),'maria@example.com')
    await interagir.click(screen.getByRole('button',{name:'Criar usuário'}))
    await waitFor(() => expect(usuariosApi.criarUsuario).toHaveBeenCalledWith({nome:'Maria', email:'maria@example.com', role:'comum',setorId:null,dataNascimento:null}))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(toast.success).toHaveBeenCalledWith('Convite enviado para maria@example.com.')
  })
  it('USU-02: e-mail que não saiu vira aviso com a ação de reenviar', async () => {
    const interagir=montar(); await screen.findByText('Maria')
    vi.mocked(usuariosApi.criarUsuario).mockResolvedValue({...pessoa, convitePendente:true, emailEnviado:false})
    vi.mocked(usuariosApi.reenviarConvite).mockResolvedValue(true)
    await waitFor(() => expect((screen.getByRole('button',{name:'Novo usuário'}) as HTMLButtonElement).disabled).toBe(false))
    await interagir.click(screen.getByRole('button',{name:'Novo usuário'}))
    await interagir.type(screen.getByLabelText(/^NOME COMPLETO$/i),'Maria')
    await interagir.type(screen.getByLabelText(/^E-MAIL$/i),'maria@example.com')
    await interagir.click(screen.getByRole('button',{name:'Criar usuário'}))
    await waitFor(() => expect(toast.warning).toHaveBeenCalled())
    const [mensagem, opcoes] = vi.mocked(toast.warning).mock.calls[0] as [string, { action: { label: string, onClick: () => void } }]
    expect(mensagem).toBe('Usuário cadastrado, mas o convite não foi enviado.')
    expect(opcoes.action.label).toBe('Reenviar convite')
    opcoes.action.onClick()
    await waitFor(() => expect(usuariosApi.reenviarConvite).toHaveBeenCalledWith('pessoa'))
  })
  it('USU-03: edita sem pedir ou enviar senha', async () => {
    const interagir=montar(); await screen.findByText('Maria')
    vi.mocked(usuariosApi.editarUsuario).mockResolvedValue({...pessoa,nome:'Maria Silva'})
    await waitFor(() => expect((screen.getByRole('button',{name:'Editar Maria'}) as HTMLButtonElement).disabled).toBe(false))
    await interagir.click(screen.getByRole('button',{name:'Editar Maria'}))
    expect(screen.queryByLabelText(/SENHA/i)).toBeNull()
    await interagir.clear(screen.getByLabelText(/^NOME COMPLETO$/i));await interagir.type(screen.getByLabelText(/^NOME COMPLETO$/i),'Maria Silva')
    await interagir.click(screen.getByRole('button',{name:'Salvar alterações'}))
    await waitFor(() => expect(usuariosApi.editarUsuario).toHaveBeenCalledWith('pessoa', expect.objectContaining({nome:'Maria Silva',ativo:true})))
  })
  it('USU-04: cancelar não desativa; confirmar chama exclusão lógica', async () => {
    const interagir=montar(); await screen.findByText('Maria')
    vi.mocked(usuariosApi.excluirUsuario).mockResolvedValue({...pessoa,ativo:false})
    await interagir.click(screen.getByRole('button',{name:'Excluir Maria'}))
    await interagir.click(screen.getByRole('button',{name:'Cancelar'}))
    expect(usuariosApi.excluirUsuario).not.toHaveBeenCalled()
    await interagir.click(screen.getByRole('button',{name:'Excluir Maria'}))
    await interagir.click(screen.getByRole('button',{name:'Confirmar exclusão'}))
    await waitFor(() => expect(usuariosApi.excluirUsuario).toHaveBeenCalledWith('pessoa',expect.anything()))
  })
})

describe('GER-20 — ordenar a tabela de usuários pelo cabeçalho', () => {
  it('clicar em "Usuário" inverte pra Z–A e clicar de novo volta pra A–Z', async () => {
    const lista = [
      { ...pessoa, id: 'p1', nome: 'Beatriz' },
      { ...pessoa, id: 'p2', nome: 'Ana' },
    ]
    const interagir = montar(lista)
    await screen.findByText('Ana')

    const nomes = () => screen.getAllByText(/^(Ana|Beatriz)$/).map((el) => el.textContent)
    expect(nomes()).toEqual(['Ana', 'Beatriz'])

    await interagir.click(screen.getByRole('button', { name: /^Usuário/ }))
    expect(nomes()).toEqual(['Beatriz', 'Ana'])

    await interagir.click(screen.getByRole('button', { name: /^Usuário/ }))
    expect(nomes()).toEqual(['Ana', 'Beatriz'])
  })
})

describe('USU-01/USU-02 — paginação e falhas de validação', () => {
  it('pagina os resultados sem perder o filtro atual', async () => {
    const lista=Array.from({length:11},(_,indice)=>({...pessoa,id:`p${indice}`,nome:`Pessoa ${indice}`}))
    const interagir=montar(lista)
    await screen.findByText('Pessoa 0')
    expect(screen.queryByText('Pessoa 10')).toBeNull()
    await interagir.click(screen.getByRole('button',{name:'Próxima'}))
    expect(screen.getByText('Pessoa 10')).toBeTruthy()
    await interagir.type(screen.getByLabelText(/^BUSCAR POR NOME OU E-MAIL$/i),'Pessoa 0')
    expect(screen.getByText('Pessoa 0')).toBeTruthy()
    expect(screen.queryByText('Pessoa 10')).toBeNull()
  })
  it('preserva o formulário e associa e-mail duplicado ao campo', async () => {
    const interagir=montar();await screen.findByText('Maria')
    const erro=Object.assign(new Error('Conflito'),{isAxiosError:true,response:{data:{campo:'email',mensagem:'E-mail duplicado'}}})
    vi.mocked(usuariosApi.criarUsuario).mockRejectedValue(erro)
    await waitFor(() => expect((screen.getByRole('button',{name:'Novo usuário'}) as HTMLButtonElement).disabled).toBe(false))
    await interagir.click(screen.getByRole('button',{name:'Novo usuário'}))
    await interagir.type(screen.getByLabelText(/^NOME COMPLETO$/i),'Maria')
    await interagir.type(screen.getByLabelText(/^E-MAIL$/i),'maria@example.com')
    await interagir.click(screen.getByRole('button',{name:'Criar usuário'}))
    await waitFor(() => expect(screen.getAllByText('E-mail duplicado').length).toBe(2))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect((within(screen.getByRole('dialog')).getByRole('textbox', {name:/E-MAIL/i}) as HTMLInputElement).value).toBe('maria@example.com')
  })
})

describe('USU-01/USU-08 — convite pendente', () => {
  it('USU-01: mostra o selo e filtra pendentes separados dos ativos', async () => {
    const interagir=montar([pessoa, convidada]); await screen.findByText('Maria')
    expect(within(screen.getByText('Joana').closest('tr')!).getByText('Convite pendente')).toBeTruthy()
    expect(within(screen.getByText('Maria').closest('tr')!).queryByText('Convite pendente')).toBeNull()
    await interagir.selectOptions(screen.getByLabelText(/^STATUS$/i), 'pendente')
    expect(screen.getByText('Joana')).toBeTruthy()
    expect(screen.queryByText('Maria')).toBeNull()
    await interagir.selectOptions(screen.getByLabelText(/^STATUS$/i), 'ativo')
    expect(screen.getByText('Maria')).toBeTruthy()
    expect(screen.queryByText('Joana')).toBeNull()
  })
  it('USU-08: reenvia o convite só de quem está pendente', async () => {
    const interagir=montar([pessoa, convidada]); await screen.findByText('Maria')
    vi.mocked(usuariosApi.reenviarConvite).mockResolvedValue(true)
    expect(screen.queryByRole('button',{name:'Reenviar convite para Maria'})).toBeNull()
    await interagir.click(screen.getByRole('button',{name:'Reenviar convite para Joana'}))
    await waitFor(() => expect(usuariosApi.reenviarConvite).toHaveBeenCalledWith('convidada'))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Convite reenviado para joana@example.com.'))
  })
  it('USU-08: avisa quando o reenvio não saiu', async () => {
    const interagir=montar([convidada]); await screen.findByText('Joana')
    vi.mocked(usuariosApi.reenviarConvite).mockResolvedValue(false)
    await interagir.click(screen.getByRole('button',{name:'Reenviar convite para Joana'}))
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith('O convite não foi enviado. Tente novamente em instantes.'))
  })
  it('USU-08: desativado não tem reenvio', async () => {
    montar([{...convidada, ativo:false}]); await screen.findByText('Joana')
    expect(screen.queryByRole('button',{name:'Reenviar convite para Joana'})).toBeNull()
    expect(within(screen.getByText('Joana').closest('tr')!).getByText('Inativo')).toBeTruthy()
  })
})
