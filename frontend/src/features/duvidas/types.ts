/** Contrato espelhado de backend/app/modules/duvidas/schemas.py. */
export interface Setor {
  id: string
  nome: string
}

export interface Faq {
  id: string
  pergunta: string
  resposta: string
  setorId: string
  setorNome: string
  autorId: string
  autorNome: string
  criadoEm: string
  atualizadoEm: string | null
}

export interface NovaFaq {
  pergunta: string
  resposta: string
  /** Opcional: o backend usa o setor do próprio usuário quando não vem. */
  setorId?: string
}

/** O setor não muda depois de criada (o PUT não recebe `setor_id`). */
export interface EdicaoFaq {
  pergunta?: string
  resposta?: string
}

/** Contrato de erro de validação de campo vindo do backend, conforme
 * docs/arquitetura-frontend.md. */
export interface ErroCampo {
  campo: string
  mensagem: string
}
