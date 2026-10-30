import { api } from '../../lib/api'
import type { Ramal, SetorComRamais } from './types'

interface RamalApi {
  id: string
  numero: string
  setor_id: string
}

interface SetorApi {
  id: string
  nome: string
  criado_em: string
  ramais: RamalApi[]
}

function paraRamal(bruto: RamalApi): Ramal {
  return {
    id: bruto.id,
    numero: bruto.numero,
    setorId: bruto.setor_id,
  }
}

function paraSetor(bruto: SetorApi): SetorComRamais {
  return {
    id: bruto.id,
    nome: bruto.nome,
    criadoEm: bruto.criado_em,
    ramais: bruto.ramais.map(paraRamal),
  }
}

export async function listarSetores(): Promise<SetorComRamais[]> {
  const { data } = await api.get<SetorApi[]>('/setores')
  return data.map(paraSetor)
}

export async function criarSetor(nome: string): Promise<SetorComRamais> {
  const { data } = await api.post<SetorApi>('/setores', { nome })
  return paraSetor(data)
}

export async function renomearSetor(id: string, nome: string): Promise<SetorComRamais> {
  const { data } = await api.put<SetorApi>(`/setores/${id}`, { nome })
  return paraSetor(data)
}

export async function excluirSetor(id: string): Promise<void> {
  await api.delete(`/setores/${id}`)
}

export async function criarRamal(setorId: string, numero: string): Promise<Ramal> {
  const { data } = await api.post<RamalApi>(`/setores/${setorId}/ramais`, { numero })
  return paraRamal(data)
}

export async function excluirRamal(id: string): Promise<void> {
  await api.delete(`/ramais/${id}`)
}
