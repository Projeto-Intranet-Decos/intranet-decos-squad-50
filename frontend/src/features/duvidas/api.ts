import { api } from '../../lib/api'
import type { EdicaoFaq, Faq, NovaFaq, Setor } from './types'

// Espelho de FaqResposta (backend/app/modules/duvidas/schemas.py).
interface FaqApi {
  id: string
  pergunta: string
  resposta: string
  setor_id: string
  setor_nome: string
  autor_id: string
  autor_nome: string
  criado_em: string
  atualizado_em: string | null
}

interface SetorApi {
  id: string
  nome: string
}

function paraFaq(bruto: FaqApi): Faq {
  return {
    id: bruto.id,
    pergunta: bruto.pergunta,
    resposta: bruto.resposta,
    setorId: bruto.setor_id,
    setorNome: bruto.setor_nome,
    autorId: bruto.autor_id,
    autorNome: bruto.autor_nome,
    criadoEm: bruto.criado_em,
    atualizadoEm: bruto.atualizado_em,
  }
}

export async function listarFaq(): Promise<Faq[]> {
  const { data } = await api.get<FaqApi[]>('/duvidas/faq')
  return data.map(paraFaq)
}

export async function criarFaq(dados: NovaFaq): Promise<Faq> {
  const { data } = await api.post<FaqApi>('/duvidas/faq', {
    pergunta: dados.pergunta,
    resposta: dados.resposta,
    ...(dados.setorId ? { setor_id: dados.setorId } : {}),
  })
  return paraFaq(data)
}

export async function editarFaq(id: string, edicao: EdicaoFaq): Promise<Faq> {
  const { data } = await api.put<FaqApi>(`/duvidas/faq/${id}`, edicao)
  return paraFaq(data)
}

export async function excluirFaq(id: string): Promise<void> {
  await api.delete(`/duvidas/faq/${id}`)
}

export async function listarSetores(): Promise<Setor[]> {
  const { data } = await api.get<SetorApi[]>('/setores')
  return data.map((setor) => ({ id: setor.id, nome: setor.nome }))
}
