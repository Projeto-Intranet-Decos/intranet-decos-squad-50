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
}

export interface FiltroDocumentos {
  busca?: string
  setorId?: string
  categoria?: CategoriaDocumento | ''
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
