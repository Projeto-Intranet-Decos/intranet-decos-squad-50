import { api } from '../../lib/api'
import type {
  CategoriaDocumento,
  Documento,
  EdicaoDocumento,
  FiltroDocumentos,
  NovoDocumento,
  Setor,
  VersaoDocumento,
} from './types'

// Espelho de DocumentoResposta (backend/app/modules/documentos/schemas.py).
interface DocumentoApi {
  id: string
  titulo: string
  descricao: string | null
  categoria: CategoriaDocumento
  nome_arquivo: string
  tipo_conteudo: string
  tamanho_bytes: number
  setor_id: string
  setor_nome: string
  autor_id: string
  autor_nome: string
  criado_em: string
  atualizado_em: string | null
  versao: number
}

interface VersaoApi {
  numero: number
  nome_arquivo: string
  tipo_conteudo: string
  tamanho_bytes: number
  alteracao: string | null
  autor_id: string
  autor_nome: string
  criado_em: string
}

interface SetorApi {
  id: string
  nome: string
}

function paraDocumento(bruto: DocumentoApi): Documento {
  return {
    id: bruto.id,
    titulo: bruto.titulo,
    descricao: bruto.descricao,
    categoria: bruto.categoria,
    setorId: bruto.setor_id,
    setorNome: bruto.setor_nome,
    nomeArquivo: bruto.nome_arquivo,
    tipoConteudo: bruto.tipo_conteudo,
    tamanhoBytes: bruto.tamanho_bytes,
    autorId: bruto.autor_id,
    autorNome: bruto.autor_nome,
    criadoEm: bruto.criado_em,
    atualizadoEm: bruto.atualizado_em,
    versao: bruto.versao,
  }
}

export async function listarDocumentos(filtro: FiltroDocumentos = {}): Promise<Documento[]> {
  const { data } = await api.get<DocumentoApi[]>('/documentos', {
    params: {
      ...(filtro.busca ? { busca: filtro.busca } : {}),
      ...(filtro.setorId ? { setor_id: filtro.setorId } : {}),
      ...(filtro.categoria ? { categoria: filtro.categoria } : {}),
      ...(filtro.desde ? { desde: filtro.desde } : {}),
    },
  })
  return data.map(paraDocumento)
}

export async function buscarDocumento(id: string): Promise<Documento> {
  const { data } = await api.get<DocumentoApi>(`/documentos/${id}`)
  return paraDocumento(data)
}

// O POST recebe Form (multipart): metadados + arquivo no mesmo envio.
export async function criarDocumento(dados: NovoDocumento): Promise<Documento> {
  const corpo = new FormData()
  corpo.append('titulo', dados.titulo)
  if (dados.descricao) corpo.append('descricao', dados.descricao)
  corpo.append('categoria', dados.categoria)
  if (dados.setorId) corpo.append('setor_id', dados.setorId)
  corpo.append('arquivo', dados.arquivo)
  const { data } = await api.post<DocumentoApi>('/documentos', corpo)
  return paraDocumento(data)
}

export async function editarDocumento(id: string, edicao: EdicaoDocumento): Promise<Documento> {
  const { data } = await api.put<DocumentoApi>(`/documentos/${id}`, edicao)
  return paraDocumento(data)
}

export async function substituirArquivo(id: string, arquivo: File, alteracao?: string): Promise<Documento> {
  const corpo = new FormData()
  corpo.append('arquivo', arquivo)
  if (alteracao) corpo.append('alteracao', alteracao)
  const { data } = await api.put<DocumentoApi>(`/documentos/${id}/arquivo`, corpo)
  return paraDocumento(data)
}

export async function excluirDocumento(id: string): Promise<void> {
  await api.delete(`/documentos/${id}`)
}

// Download passa pelo axios (precisa do Bearer), então vem como Blob e o
// navegador recebe uma URL local — link direto pro endpoint não levaria o token.
export async function baixarArquivo(id: string, inline = false): Promise<Blob> {
  const { data } = await api.get<Blob>(`/documentos/${id}/download`, {
    params: { inline },
    responseType: 'blob',
  })
  return data
}

export async function listarVersoes(id: string): Promise<VersaoDocumento[]> {
  const { data } = await api.get<VersaoApi[]>(`/documentos/${id}/versoes`)
  return data.map((bruta) => ({
    numero: bruta.numero,
    nomeArquivo: bruta.nome_arquivo,
    tipoConteudo: bruta.tipo_conteudo,
    tamanhoBytes: bruta.tamanho_bytes,
    alteracao: bruta.alteracao,
    autorId: bruta.autor_id,
    autorNome: bruta.autor_nome,
    criadoEm: bruta.criado_em,
  }))
}

export async function baixarVersaoArquivo(id: string, numero: number): Promise<Blob> {
  const { data } = await api.get<Blob>(`/documentos/${id}/versoes/${numero}/download`, { responseType: 'blob' })
  return data
}

export async function listarSetores(): Promise<Setor[]> {
  const { data } = await api.get<SetorApi[]>('/setores')
  return data.map((setor) => ({ id: setor.id, nome: setor.nome }))
}
