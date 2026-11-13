import { describe, expect, it } from 'vitest'
import type { Usuario } from '../auth/tipos'
import { montarPassos } from './passos'

const comum: Usuario = { id: 'c', nome: 'Carla Mendes', role: 'comum', setorId: 'enf' }
const adminSetor: Usuario = { id: 'a', nome: 'Roberto Souza', role: 'admin_setor', setorId: 'rh' }
const superadmin: Usuario = { id: 's', nome: 'Super Admin', role: 'superadmin', setorId: null }

const ACOES_DE_ESCRITA = /\b(publica|edita|cadastra|cria|exclui|adiciona|remove)\b/i

function alvos(usuario: Usuario | null) {
  return montarPassos(usuario, true).map((passo) => passo.alvo)
}

function textoDo(usuario: Usuario | null, alvo: string) {
  return montarPassos(usuario, true).find((passo) => passo.alvo === alvo)?.texto ?? ''
}

describe('GER-23 — passos da introdução por acesso', () => {
  it('começa pelas boas-vindas, sem destaque, com o primeiro nome', () => {
    const [primeiro] = montarPassos(comum, true)
    expect(primeiro.alvo).toBeNull()
    expect(primeiro.titulo).toBe('Olá, Carla!')
  })

  it('segue a ordem do menu e mostra Administração só ao superadmin', () => {
    expect(alvos(comum)).toEqual([null, 'mural', 'calendario', 'documentos', 'duvidas', 'setores', 'atalhos', 'configuracoes', 'conta'])
    expect(alvos(adminSetor)).not.toContain('administracao')
    expect(alvos(superadmin)).toEqual([null, 'mural', 'calendario', 'documentos', 'duvidas', 'setores', 'administracao', 'atalhos', 'configuracoes', 'conta'])
  })

  it.each([['visitante', null], ['comum', comum]] as const)('%s não lê sobre publicar nem editar', (_nome, usuario) => {
    for (const passo of montarPassos(usuario, true)) {
      expect(passo.texto).not.toMatch(ACOES_DE_ESCRITA)
    }
  })

  it('sem atalhos na tela, o passo Acesso rápido é pulado', () => {
    expect(montarPassos(comum, false).map((passo) => passo.alvo)).not.toContain('atalhos')
  })

  it('visitante não vê Configurações e é avisado que baixar exige entrar', () => {
    expect(alvos(null)).not.toContain('configuracoes')
    expect(textoDo(null, 'documentos')).toContain('é preciso entrar')
  })

  it('admin_setor gerencia o próprio setor; superadmin, qualquer setor', () => {
    expect(textoDo(adminSetor, 'mural')).toContain('do seu setor')
    expect(textoDo(superadmin, 'mural')).toContain('de qualquer setor')
    expect(textoDo(adminSetor, 'setores')).toContain('ramais do seu setor')
    expect(textoDo(superadmin, 'setores')).toContain('exclui setores')
  })
})
