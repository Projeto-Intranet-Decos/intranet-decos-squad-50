import { describe, expect, it } from 'vitest'
import type { Usuario } from './auth/tipos'
import {
  canAcessarAdministracao,
  canAdministrarSetores,
  canEditar,
  canEscolherSetor,
  canGerenciarAtalhos,
  canGerenciarConteudo,
  canAlterarUsuario,
  canEditarAviso,
  canGerenciarSetor,
  canGerenciarUsuarios,
  canPublicarAviso,
  canVerLogs,
  papeisAtribuiveis,
  setoresParaPublicar,
} from './permissions'

const comum: Usuario = { id: 'c', nome: 'Comum', role: 'comum', setorId: 'enf' }
const adminEnfermagem: Usuario = { id: 'a', nome: 'Admin', role: 'admin_setor', setorId: 'enf' }
const marketing: Usuario = { id: 'm', nome: 'Marketing', role: 'marketing', setorId: 'mkt' }
const rh: Usuario = { id: 'r', nome: 'RH', role: 'rh', setorId: 'rh' }
const superadmin: Usuario = { id: 's', nome: 'Superadmin', role: 'superadmin', setorId: null }

describe('permissões por papel', () => {
  it('sem usuário logado não pode nada', () => {
    expect(canGerenciarConteudo(null)).toBe(false)
    expect(canGerenciarSetor(undefined, 'enf')).toBe(false)
    expect(canAcessarAdministracao(null)).toBe(false)
  })

  it('comum só lê', () => {
    expect(canGerenciarConteudo(comum)).toBe(false)
    expect(canEditar(comum, { setorId: 'enf' })).toBe(false)
    expect(canAdministrarSetores(comum)).toBe(false)
    expect(canAcessarAdministracao(comum)).toBe(false)
    expect(canGerenciarAtalhos(comum)).toBe(false)
  })

  it('admin_setor gerencia só o próprio setor', () => {
    expect(canGerenciarConteudo(adminEnfermagem)).toBe(true)
    expect(canEditar(adminEnfermagem, { setorId: 'enf' })).toBe(true)
    expect(canEditar(adminEnfermagem, { setorId: 'rh' })).toBe(false)
    expect(canEscolherSetor(adminEnfermagem)).toBe(false)
    expect(canAdministrarSetores(adminEnfermagem)).toBe(false)
    expect(canAcessarAdministracao(adminEnfermagem)).toBe(false)
  })

  it('superadmin gerencia qualquer setor e acessa a administração', () => {
    expect(canEditar(superadmin, { setorId: 'rh' })).toBe(true)
    expect(canEscolherSetor(superadmin)).toBe(true)
    expect(canAdministrarSetores(superadmin)).toBe(true)
    expect(canAcessarAdministracao(superadmin)).toBe(true)
    expect(canGerenciarAtalhos(superadmin)).toBe(true)
  })

  it('admin_setor só publica no próprio setor; superadmin em qualquer um', () => {
    const setores = [{ id: 'enf' }, { id: 'rh' }]
    expect(setoresParaPublicar(adminEnfermagem, setores)).toEqual([{ id: 'enf' }])
    expect(setoresParaPublicar(superadmin, setores)).toEqual(setores)
  })
})

describe('papéis marketing e rh (USU-09)', () => {
  it('marketing publica avisos em qualquer setor, mas só edita os próprios', () => {
    expect(canPublicarAviso(marketing)).toBe(true)
    expect(canEscolherSetor(marketing)).toBe(true)
    expect(canEditarAviso(marketing, { setorId: 'enf', autorId: 'm' })).toBe(true)
    expect(canEditarAviso(marketing, { setorId: 'mkt', autorId: 'outro' })).toBe(false)
  })

  it('marketing não gerencia documentos, FAQ, usuários nem logs', () => {
    expect(canGerenciarConteudo(marketing)).toBe(false)
    expect(canEditar(marketing, { setorId: 'mkt' })).toBe(false)
    expect(canGerenciarUsuarios(marketing)).toBe(false)
    expect(canVerLogs(marketing)).toBe(false)
  })

  it('admin_setor e superadmin continuam publicando avisos pelo escopo de setor', () => {
    expect(canPublicarAviso(adminEnfermagem)).toBe(true)
    expect(canEditarAviso(adminEnfermagem, { setorId: 'enf', autorId: 'x' })).toBe(true)
    expect(canEditarAviso(adminEnfermagem, { setorId: 'rh', autorId: 'a' })).toBe(false)
    expect(canEditarAviso(superadmin, { setorId: 'rh', autorId: 'x' })).toBe(true)
    expect(canPublicarAviso(comum)).toBe(false)
    expect(canPublicarAviso(rh)).toBe(false)
  })

  it('rh entra na Administração só para Usuários, sem logs nem conteúdo', () => {
    expect(canGerenciarUsuarios(rh)).toBe(true)
    expect(canAcessarAdministracao(rh)).toBe(true)
    expect(canVerLogs(rh)).toBe(false)
    expect(canGerenciarConteudo(rh)).toBe(false)
    expect(canAdministrarSetores(rh)).toBe(false)
  })

  it('rh não atribui nem altera superadmin; superadmin faz tudo', () => {
    expect(papeisAtribuiveis(rh)).toEqual(['comum', 'admin_setor', 'rh', 'marketing'])
    expect(canAlterarUsuario(rh, { role: 'superadmin' })).toBe(false)
    expect(canAlterarUsuario(rh, { role: 'comum' })).toBe(true)
    expect(papeisAtribuiveis(superadmin)).toContain('superadmin')
    expect(canAlterarUsuario(superadmin, { role: 'superadmin' })).toBe(true)
    expect(canVerLogs(superadmin)).toBe(true)
  })
})
