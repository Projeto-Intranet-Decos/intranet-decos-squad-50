import { api } from '../../lib/api'
import type { Atalho, DadosAtalho } from './types'

interface AtalhoApi {
  id: string
  titulo: string
  url: string
  criado_em: string
  atualizado_em: string | null
}

function paraAtalho(bruto: AtalhoApi): Atalho {
  return { id: bruto.id, titulo: bruto.titulo, url: bruto.url }
}

export async function listarAtalhos(): Promise<Atalho[]> {
  const { data } = await api.get<AtalhoApi[]>('/atalhos')
  return data.map(paraAtalho)
}

export async function criarAtalho(dados: DadosAtalho): Promise<Atalho> {
  const { data } = await api.post<AtalhoApi>('/atalhos', dados)
  return paraAtalho(data)
}

export async function atualizarAtalho(id: string, dados: DadosAtalho): Promise<Atalho> {
  const { data } = await api.put<AtalhoApi>(`/atalhos/${id}`, dados)
  return paraAtalho(data)
}

export async function excluirAtalho(id: string): Promise<void> {
  await api.delete(`/atalhos/${id}`)
}
