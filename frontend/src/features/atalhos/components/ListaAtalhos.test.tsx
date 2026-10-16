// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Papel } from '../../../lib/auth/tipos'
import * as api from '../api'
import ListaAtalhos from './ListaAtalhos'

vi.mock('../../../lib/auth/useAuth', () => ({ useAuth: () => ({ usuario: estado.usuario }) }))
vi.mock('../api')
const estado=vi.hoisted(() => ({usuario:{id:'admin',role:'superadmin' as Papel,setorId:null}}))
const atalho={id:'atalho',titulo:'Portal',url:'https://example.com',criadoEm:'2026-10-16T10:00:00Z',atualizadoEm:null}
function montar(recolhido=false) {
  vi.mocked(api.listarAtalhos).mockResolvedValue([atalho])
  const cliente=new QueryClient({defaultOptions:{queries:{retry:false}}})
  render(<QueryClientProvider client={cliente}><ListaAtalhos compacto={recolhido} aoNavegar={() => {}} /></QueryClientProvider>)
  return userEvent.setup()
}
afterEach(() => {cleanup();vi.clearAllMocks();estado.usuario.role='superadmin'})

describe('ATA-05 — sidebar inline preservada na integração', () => {
  it.each(['comum','admin_setor'] as const)('mostra links sem gerenciamento para %s', async role => {
    estado.usuario.role=role;montar();await screen.findByRole('link',{name:'Portal'})
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('cria com Enter e cancela edição com Esc sem modal', async () => {
    const interagir=montar();await screen.findByRole('link',{name:'Portal'})
    vi.mocked(api.criarAtalho).mockResolvedValue(atalho)
    await interagir.click(screen.getByRole('button',{name:'Adicionar atalho'}))
    expect(screen.queryByRole('dialog')).toBeNull()
    await interagir.type(screen.getByLabelText('Nome do atalho'),'Novo portal')
    await interagir.type(screen.getByLabelText('URL do atalho'),'https://example.com{Enter}')
    await waitFor(() => expect(api.criarAtalho).toHaveBeenCalledWith({titulo:'Novo portal',url:'https://example.com'}))
    await waitFor(() => expect(screen.queryByLabelText('Nome do atalho')).toBeNull())
    await interagir.click(screen.getByRole('button',{name:'Editar Portal'}))
    await interagir.type(screen.getByLabelText('Nome do atalho'),'{Escape}')
    expect(screen.queryByLabelText('Nome do atalho')).toBeNull()
    expect(api.atualizarAtalho).not.toHaveBeenCalled()
  })
  it('confirma exclusão inline e preserva link no menu recolhido', async () => {
    const interagir=montar();await screen.findByRole('link',{name:'Portal'})
    await interagir.click(screen.getByRole('button',{name:'Excluir Portal'}))
    expect(screen.queryByRole('dialog')).toBeNull()
    await interagir.click(screen.getByRole('button',{name:'Não'}))
    expect(api.excluirAtalho).not.toHaveBeenCalled()
    await interagir.click(screen.getByRole('button',{name:'Excluir Portal'}))
    vi.mocked(api.excluirAtalho).mockResolvedValue(undefined)
    await interagir.click(screen.getByRole('button',{name:'Sim'}))
    await waitFor(() => expect(api.excluirAtalho).toHaveBeenCalledWith('atalho'))
  })
  it('menu recolhido exibe link sem botões de gerenciamento', async () => {
    montar(true);const link=await screen.findByRole('link',{name:'Portal'})
    expect(link.getAttribute('target')).toBe('_blank')
    expect(screen.queryByRole('button')).toBeNull()
  })
})
