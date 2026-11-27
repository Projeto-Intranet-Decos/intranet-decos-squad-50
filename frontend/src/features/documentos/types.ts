/** Contrato espelhado de backend/app/modules/documentos/schemas.py. */
export interface Setor {
  id: string
  nome: string
}

/** Mesmos valores de `CategoriaDocumento` no backend. */
export type CategoriaDocumento = 'pop' | 'protocolo' | 'manual' | 'formulario' | 'outro'

export const ROTULOS_CATEGORIA: Record<CategoriaDocumento, string> = {
  pop: 'POP',
  protocolo: 'Protocolo',
  manual: 'Manual',
  formulario: 'Formulário',
  outro: 'Outro',
}

export interface Documento {
  id: string
  titulo: string
  descricao: string | null
  categoria: CategoriaDocumento
  setorId: string
  setorNome: string
  nomeArquivo: string
  tipoConteudo: string
  tamanhoBytes: number
  autorId: string
  autorNome: string
  criadoEm: string
  atualizadoEm: string | null
  /** Número da versão atual (DOC-09). */
  versao: number
  /** Quem enviou a versão atual do arquivo (GER-28). */
  versaoAutorId: string
  /** ISO: envio da versão atual. Editar só os metadados não muda (GER-28). */
  versaoCriadaEm: string
}

/** Espelho de VersaoResposta (DOC-09). */
export interface VersaoDocumento {
  numero: number
  nomeArquivo: string
  tipoConteudo: string
  tamanhoBytes: number
  alteracao: string | null
  autorId: string
  autorNome: string
  criadoEm: string
}

export interface FiltroDocumentos {
  busca?: string
  setorId?: string
  categoria?: CategoriaDocumento | ''
  /** ISO com fuso: só os criados ou com versão nova depois (GER-28). */
  desde?: string
}

export interface NovoDocumento {
  titulo: string
  descricao?: string
  categoria: CategoriaDocumento
  /** Opcional: o backend usa o setor do próprio usuário quando não vem. */
  setorId?: string
  arquivo: File
}

export interface EdicaoDocumento {
  titulo?: string
  /** `null` limpa a descrição. */
  descricao?: string | null
  categoria?: CategoriaDocumento
}

/** Contrato de erro de validação de campo vindo do backend, conforme
 * docs/arquitetura-frontend.md. */
export interface ErroCampo {
  campo: string
  mensagem: string
}
