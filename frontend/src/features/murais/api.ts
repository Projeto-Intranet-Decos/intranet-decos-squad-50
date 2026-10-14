import { api } from '../../lib/api'
import { formatarTamanhoArquivo } from './formatadores'
import type {
  Aniversariante,
  Aviso,
  CategoriaAviso,
  EdicaoAviso,
  Evento,
  FiltroEventos,
  NovoAviso,
  Setor,
} from './types'

interface AnexoApi {
  id: string
  nome_arquivo: string
  tipo_conteudo: string
  tamanho_bytes: number
}

interface AvisoApi {
  id: string
  titulo: string
  conteudo: string | null
  categoria: CategoriaAviso
  data_inicio: string | null
  data_fim: string | null
  fixado: boolean
  possui_imagem: boolean
  versao_imagem: string | null
  anexos: AnexoApi[]
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

function paraAviso(bruto: AvisoApi): Aviso {
  return {
    id: bruto.id,
    titulo: bruto.titulo,
    conteudo: bruto.conteudo,
    // Rota pública (a tag <img> não manda o Bearer); `v` muda a cada troca de capa.
    urlImagem: bruto.possui_imagem
      ? `${api.defaults.baseURL}/murais/avisos/${bruto.id}/imagem?v=${bruto.versao_imagem}`
      : null,
    categoria: bruto.categoria,
    dataInicio: bruto.data_inicio,
    dataFim: bruto.data_fim,
    fixado: bruto.fixado,
    autorId: bruto.autor_id,
    autorNome: bruto.autor_nome,
    setorId: bruto.setor_id,
    setorNome: bruto.setor_nome,
    anexos: bruto.anexos.map((anexo) => ({
      id: anexo.id,
      nome: anexo.nome_arquivo,
      tamanho: formatarTamanhoArquivo(anexo.tamanho_bytes),
      tipoConteudo: anexo.tipo_conteudo,
    })),
    criadoEm: bruto.criado_em,
    atualizadoEm: bruto.atualizado_em,
  }
}

// Só manda o que foi informado: no PUT o backend aplica apenas os campos
// presentes (`null` em conteudo/data_fim limpa o campo). O setor não é
// editável depois de criado (AvisoAtualizar não aceita setor_id), então só
// vai no POST.
function paraCorpoAviso(dados: EdicaoAviso) {
  return {
    ...(dados.titulo !== undefined ? { titulo: dados.titulo } : {}),
    ...(dados.conteudo !== undefined ? { conteudo: dados.conteudo } : {}),
    ...(dados.categoria !== undefined ? { categoria: dados.categoria } : {}),
    ...(dados.dataInicio !== undefined ? { data_inicio: dados.dataInicio } : {}),
    ...(dados.dataFim !== undefined ? { data_fim: dados.dataFim } : {}),
    ...(dados.fixado !== undefined ? { fixado: dados.fixado } : {}),
  }
}

export async function listarAvisos(): Promise<Aviso[]> {
  const { data } = await api.get<AvisoApi[]>('/murais/avisos')
  return data.map(paraAviso)
}

export async function buscarAviso(id: string): Promise<Aviso> {
  const { data } = await api.get<AvisoApi>(`/murais/avisos/${id}`)
  return paraAviso(data)
}

// Multipart: o axios monta o boundary sozinho (lib/api.ts não fixa Content-Type).
export async function criarAviso(dados: NovoAviso): Promise<Aviso> {
  const formulario = new FormData()
  formulario.append('titulo', dados.titulo)
  if (dados.conteudo) formulario.append('conteudo', dados.conteudo)
  formulario.append('categoria', dados.categoria)
  if (dados.dataInicio) formulario.append('data_inicio', dados.dataInicio)
  if (dados.dataFim) formulario.append('data_fim', dados.dataFim)
  formulario.append('fixado', String(dados.fixado))
  if (dados.setorId) formulario.append('setor_id', dados.setorId)
  if (dados.imagem) formulario.append('imagem', dados.imagem)
  for (const anexo of dados.anexos ?? []) formulario.append('anexos', anexo)
  const { data } = await api.post<AvisoApi>('/murais/avisos', formulario)
  return paraAviso(data)
}

export async function editarAviso(id: string, edicao: EdicaoAviso): Promise<Aviso> {
  const { data } = await api.put<AvisoApi>(`/murais/avisos/${id}`, paraCorpoAviso(edicao))
  return paraAviso(data)
}

export async function excluirAviso(id: string): Promise<void> {
  await api.delete(`/murais/avisos/${id}`)
}

export async function substituirImagemAviso(id: string, imagem: File): Promise<void> {
  const formulario = new FormData()
  formulario.append('arquivo', imagem)
  await api.put(`/murais/avisos/${id}/imagem`, formulario)
}

export async function removerImagemAviso(id: string): Promise<void> {
  await api.delete(`/murais/avisos/${id}/imagem`)
}

export async function enviarAnexosAviso(id: string, arquivos: File[]): Promise<void> {
  const formulario = new FormData()
  for (const arquivo of arquivos) formulario.append('arquivos', arquivo)
  await api.post(`/murais/avisos/${id}/anexos`, formulario)
}

export async function removerAnexoAviso(id: string, anexoId: string): Promise<void> {
  await api.delete(`/murais/avisos/${id}/anexos/${anexoId}`)
}

// O download exige o Bearer, então não dá para usar um <a href> direto: baixa como blob
// e dispara o download por um link temporário.
export async function baixarAnexoAviso(id: string, anexoId: string, nome: string): Promise<void> {
  const { data } = await api.get<Blob>(`/murais/avisos/${id}/anexos/${anexoId}/download`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function listarSetores(): Promise<Setor[]> {
  const { data } = await api.get<SetorApi[]>('/setores')
  return data.map((setor) => ({ id: setor.id, nome: setor.nome }))
}

interface AniversarianteApi {
  id: string
  nome: string
  dia: number
  setor_id: string | null
  setor_nome: string | null
}

/** Só avisos de categoria `evento`, ordenados por data de início (MUR-12). */
export async function listarEventos(filtro: FiltroEventos = {}): Promise<Evento[]> {
  const { data } = await api.get<AvisoApi[]>('/murais/eventos', {
    params: { de: filtro.de, ate: filtro.ate, setor_id: filtro.setorId },
  })
  return data.map((bruto) => paraAviso(bruto) as Evento)
}

export async function listarAniversariantes(mes: number): Promise<Aniversariante[]> {
  const { data } = await api.get<AniversarianteApi[]>('/murais/aniversariantes', {
    params: { mes },
  })
  return data.map((bruto) => ({
    id: bruto.id,
    nome: bruto.nome,
    dia: bruto.dia,
    setorId: bruto.setor_id,
    setorNome: bruto.setor_nome,
  }))
}
