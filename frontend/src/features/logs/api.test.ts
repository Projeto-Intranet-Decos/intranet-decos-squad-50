import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { listarAtividades } from './api'

vi.mock('../../lib/api', () => ({ api: { get: vi.fn() } }))

function responder(itens: object[]) {
  vi.mocked(api.get).mockResolvedValue({ data: { itens, total: itens.length } })
}

const log = {
  id: 'l1',
  usuario_nome: 'Marina Alencar',
  acao: 'criar',
  modulo: 'murais',
  entidade_tipo: 'aviso',
  resumo: 'Nova escala de plantão',
  criado_em: '2026-10-22T12:00:00Z',
}

afterEach(() => vi.clearAllMocks())

describe('LOG-04 — registro de atividades pela API', () => {
  it('busca em /logs com o limite máximo e converte para o modelo da tela', async () => {
    responder([log])

    const atividades = await listarAtividades()

    expect(api.get).toHaveBeenCalledWith('/logs', { params: { limite: 200 } })
    expect(atividades).toEqual([
      {
        id: 'l1',
        criadoEm: '2026-10-22T12:00:00Z',
        usuarioNome: 'Marina Alencar',
        acao: 'Criou aviso',
        detalhe: 'Nova escala de plantão',
        area: 'murais',
      },
    ])
  })

  it.each([
    ['editar', 'faq', 'duvidas', 'Editou pergunta'],
    ['excluir', 'documento', 'documentos', 'Excluiu documento'],
    ['excluir', 'usuario', 'usuarios', 'Desativou usuário'],
    ['criar', 'ramal', 'setores', 'Criou ramal'],
  ])('descreve %s %s', async (acao, entidade_tipo, modulo, esperado) => {
    responder([{ ...log, acao, entidade_tipo, modulo }])

    const [atividade] = await listarAtividades()

    expect(atividade.acao).toBe(esperado)
  })
})
