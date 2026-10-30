import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { criarFaq, editarFaq, excluirFaq, listarFaq, listarSetores } from './api'

vi.mock('../../lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))

const faqApi = {
  id: 'f1',
  pergunta: 'Como solicito férias?',
  resposta: 'Pelo formulário FORM-RH-002.',
  setor_id: 'rh',
  setor_nome: 'RH',
  autor_id: 'u1',
  autor_nome: 'Marina Alencar',
  criado_em: '2026-10-01T10:00:00Z',
  atualizado_em: null,
}

const faq = {
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

afterEach(() => vi.clearAllMocks())

describe('DUV-01 — listar perguntas pela API', () => {
  it('busca em /duvidas/faq e converte para o modelo da tela', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [faqApi] })

    expect(await listarFaq()).toEqual([faq])
    expect(api.get).toHaveBeenCalledWith('/duvidas/faq')
  })
})

describe('DUV-03 — cadastrar pergunta pela API', () => {
  it('envia pergunta, resposta e setor_id em JSON', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: faqApi })

    const criada = await criarFaq({ pergunta: faq.pergunta, resposta: faq.resposta, setorId: 'rh' })

    expect(api.post).toHaveBeenCalledWith('/duvidas/faq', {
      pergunta: faq.pergunta,
      resposta: faq.resposta,
      setor_id: 'rh',
    })
    expect(criada).toEqual(faq)
  })

  it('sem setor, não manda setor_id (o backend usa o do usuário)', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: faqApi })

    await criarFaq({ pergunta: faq.pergunta, resposta: faq.resposta })

    expect(api.post).toHaveBeenCalledWith('/duvidas/faq', { pergunta: faq.pergunta, resposta: faq.resposta })
  })
})

describe('DUV-04 — editar pergunta pela API', () => {
  it('manda só pergunta e resposta no PUT', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { ...faqApi, atualizado_em: '2026-10-02T10:00:00Z' } })

    const editada = await editarFaq('f1', { pergunta: 'Nova?', resposta: 'Nova.' })

    expect(api.put).toHaveBeenCalledWith('/duvidas/faq/f1', { pergunta: 'Nova?', resposta: 'Nova.' })
    expect(editada.atualizadoEm).toBe('2026-10-02T10:00:00Z')
  })
})

describe('DUV-05 — excluir pergunta pela API', () => {
  it('chama DELETE /duvidas/faq/{id}', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: undefined })

    await excluirFaq('f1')

    expect(api.delete).toHaveBeenCalledWith('/duvidas/faq/f1')
  })
})

describe('DUV-06 — setores do formulário', () => {
  it('vêm de /setores, só com id e nome', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{ id: 'rh', nome: 'RH', criado_em: '2026-10-01T10:00:00Z', ramais: [] }],
    })

    expect(await listarSetores()).toEqual([{ id: 'rh', nome: 'RH' }])
    expect(api.get).toHaveBeenCalledWith('/setores')
  })
})
