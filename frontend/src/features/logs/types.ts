/**
 * Ações administrativas (criar, editar, excluir) em qualquer módulo — o "Log de auditoria" do
 * CONTEXT.md. A área é o módulo do backend (LOG-01).
 */
export type AreaAtividade = 'murais' | 'documentos' | 'duvidas' | 'setores' | 'usuarios' | 'atalhos'

export const ROTULO_AREA: Record<AreaAtividade, string> = {
  murais: 'Mural',
  documentos: 'POPs',
  duvidas: 'FAQ',
  setores: 'Setores',
  usuarios: 'Usuários',
  atalhos: 'Acesso rápido',
}

export interface Atividade {
  id: string
  criadoEm: string
  usuarioNome: string
  acao: string
  detalhe: string
  area: AreaAtividade
}

export type ColunaAtividade = 'data' | 'usuario' | 'acao' | 'area'
