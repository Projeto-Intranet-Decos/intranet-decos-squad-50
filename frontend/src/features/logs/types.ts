/**
 * Modelo mockado — backend/app/modules/logs ainda está vazio, então não há
 * contrato de API definido. Segue o conceito de "Log de auditoria" do
 * CONTEXT.md: ações administrativas (criar, editar, deletar) em qualquer
 * módulo, sem ações de leitura.
 */
export type AreaAtividade = 'mural' | 'documentos' | 'duvidas' | 'setores' | 'usuarios'

export const ROTULO_AREA: Record<AreaAtividade, string> = {
  mural: 'Mural',
  documentos: 'POPs',
  duvidas: 'FAQ',
  setores: 'Setores',
  usuarios: 'Usuários',
}

export interface Atividade {
  id: string
  criadoEm: string
  usuarioNome: string
  acao: string
  detalhe: string
  area: AreaAtividade
}
