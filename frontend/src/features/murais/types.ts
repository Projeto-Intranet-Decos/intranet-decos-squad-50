import type { ErroCampo, Setor } from '../../shared/types'

export type { ErroCampo, Setor }

/**
 * Modelo alinhado a `AvisoResposta` de backend/app/modules/murais/schemas.py,
 * já em camelCase (a conversão fica em ./api.ts).
 */
export type CategoriaAviso = 'comunicado' | 'promocao' | 'evento'

export const ROTULO_CATEGORIA: Record<CategoriaAviso, string> = {
  comunicado: 'Comunicado',
  promocao: 'Promoção',
  evento: 'Evento',
}

/** Limites de backend/app/modules/murais/service.py e core/arquivos.py. */
export const TIPOS_IMAGEM = ['image/png', 'image/jpeg', 'image/webp']
export const LIMITE_IMAGEM_MB = 5
export const EXTENSOES_ANEXO = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.odt', '.ods', '.odp', '.txt', '.png', '.jpg', '.jpeg',
]
export const MAXIMO_ANEXOS = 10
// TAMANHO_MAXIMO_UPLOAD_MB do backend e client_max_body_size do nginx: vale por arquivo e
// também para a requisição inteira, que na criação leva capa e anexos juntos.
export const LIMITE_UPLOAD_MB = 50

export interface Anexo {
  id: string
  nome: string
  tamanho: string
  tipoConteudo: string
}

export interface Aviso {
  id: string
  titulo: string
  /** Opcional só em evento. */
  conteudo: string | null
  /** URL pública da capa, já com `?v=` para furar o cache quando a capa muda. */
  urlImagem: string | null
  categoria: CategoriaAviso
  /** Só em evento (ISO); nas outras categorias vem `null`. */
  dataInicio: string | null
  dataFim: string | null
  fixado: boolean
  autorId: string
  autorNome: string
  setorId: string
  setorNome: string
  anexos: Anexo[]
  criadoEm: string
  atualizadoEm: string | null
}

/**
 * Evento é um aviso de categoria `evento`, que sempre tem `dataInicio`
 * (docs/specs/murais.md). Aparece no feed e no calendário.
 */
export type Evento = Aviso & { categoria: 'evento'; dataInicio: string }

export function ehEvento(aviso: Aviso): aviso is Evento {
  return aviso.categoria === 'evento' && aviso.dataInicio !== null
}

export interface NovoAviso {
  titulo: string
  /** `null` só em evento. */
  conteudo: string | null
  categoria: CategoriaAviso
  /** Só em evento. */
  dataInicio?: string | null
  dataFim?: string | null
  setorId: string
  fixado: boolean
  imagem?: File | null
  anexos?: File[]
}

/**
 * Só texto e datas; capa e anexos mudam por rotas próprias (ver hooks/useSalvarAviso.ts).
 * Evento que muda de categoria perde as datas no backend, sem precisar mandá-las.
 */
export type EdicaoAviso = Partial<Omit<NovoAviso, 'imagem' | 'anexos' | 'setorId'>>

export interface FiltroEventos {
  de?: string
  ate?: string
  setorId?: string
}

export type VisaoCalendario = 'dia' | 'semana' | 'mes' | 'ano'

export interface Aniversariante {
  id: string
  nome: string
  dia: number
  setorId: string | null
  setorNome: string | null
}
