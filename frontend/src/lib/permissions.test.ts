import { describe, expect, it } from 'vitest'
import type { Usuario } from './auth/tipos'
import {
  canAcessarAdministracao,
  canAdministrarSetores,
  canEditar,
  canEscolherSetor,
  canGerenciarAtalhos,
  canGerenciarConteudo,
  canGerenciarSetor,
  setoresParaPublicar,
} from './permissions'

const comum: Usuario = { id: 'c', nome: 'Comum', role: 'comum', setorId: 'enf' }
const adminEnfermagem: Usuario = { id: 'a', nome: 'Admin', role: 'admin_setor', setorId: 'enf' }
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
