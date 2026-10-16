// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Papel } from '../../../lib/auth/tipos'
import * as usuariosApi from '../api'
import * as setoresApi from '../../setores/api'
import type { UsuarioCadastro } from '../types'
import PaginaUsuarios from './PaginaUsuarios'

vi.mock('../../../lib/auth/useAuth', () => ({ useAuth: () => ({ usuario: estado.usuario }) }))
vi.mock('../api')
vi.mock('../../setores/api')
const estado = vi.hoisted(() => ({ usuario: { id: 'admin', role: 'superadmin' as Papel, setorId: null } }))
const pessoa: UsuarioCadastro = { id:'pessoa',nome:'Maria',email:'maria@example.com',role:'comum',setorId:null,dataNascimento:null,ativo:true,criadoEm:'2026-10-16T10:00:00Z' }

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
  it('USU-02: cadastra e envia campos tipados ao contrato HTTP', async () => {
    const interagir=montar(); await screen.findByText('Maria')
    vi.mocked(usuariosApi.criarUsuario).mockResolvedValue(pessoa)
    await waitFor(() => expect((screen.getByRole('button',{name:'Novo usuário'}) as HTMLButtonElement).disabled).toBe(false))
    await interagir.click(screen.getByRole('button',{name:'Novo usuário'}))
    await interagir.type(screen.getByLabelText(/^NOME COMPLETO$/i),'Maria')
    await interagir.type(screen.getByLabelText(/^E-MAIL$/i),'maria@example.com')
    await interagir.type(screen.getByLabelText(/^SENHA INICIAL$/i),'Senha123!')
    await interagir.click(screen.getByRole('button',{name:'Criar usuário'}))
    await waitFor(() => expect(usuariosApi.criarUsuario).toHaveBeenCalledWith({nome:'Maria', email:'maria@example.com', senha:'Senha123!',role:'comum',setorId:null,dataNascimento:null}))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
  it('USU-03: edita sem pedir ou enviar senha', async () => {
    const interagir=montar(); await screen.findByText('Maria')
    vi.mocked(usuariosApi.editarUsuario).mockResolvedValue({...pessoa,nome:'Maria Silva'})
    await waitFor(() => expect((screen.getByRole('button',{name:'Editar Maria'}) as HTMLButtonElement).disabled).toBe(false))
    await interagir.click(screen.getByRole('button',{name:'Editar Maria'}))
    expect(screen.queryByLabelText(/^SENHA INICIAL$/i)).toBeNull()
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
    await interagir.type(screen.getByLabelText(/^SENHA INICIAL$/i),'Senha123!')
    await interagir.click(screen.getByRole('button',{name:'Criar usuário'}))
    await waitFor(() => expect(screen.getAllByText('E-mail duplicado').length).toBe(2))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect((within(screen.getByRole('dialog')).getByRole('textbox', {name:/E-MAIL/i}) as HTMLInputElement).value).toBe('maria@example.com')
  })
})
