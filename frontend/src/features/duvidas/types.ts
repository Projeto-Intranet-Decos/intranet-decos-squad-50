/**
 * Modelo mockado — o contrato real (FAQ curada por admin vs. sistema de
 * ticket) ainda está em decisão com o time (ver backend/app/modules/duvidas
 * vs. CONTEXT.md). Esta tela não assume nenhum contrato de API ainda:
 * `api.ts` simula os dois fluxos que o protótipo mostra lado a lado —
 * FAQ com edição/exclusão por admin, e envio livre de pergunta por
 * qualquer colaborador — sem se comprometer com uma tabela/endpoint real.
 */
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
  criadoEm: string
  atualizadoEm: string | null
}

export interface NovaFaq {
  pergunta: string
  resposta: string
  setorId: string
}

export type EdicaoFaq = Partial<NovaFaq>

/** Contrato de erro de validação de campo vindo do backend, conforme
 * docs/arquitetura-frontend.md. */
export interface ErroCampo {
  campo: string
  mensagem: string
}
