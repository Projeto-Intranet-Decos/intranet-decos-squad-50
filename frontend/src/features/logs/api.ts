import { api } from '../../lib/api'
import type { AreaAtividade, Atividade } from './types'

type AcaoApi = 'criar' | 'editar' | 'excluir'

interface LogApi {
  id: string
  usuario_nome: string
  acao: AcaoApi
  modulo: AreaAtividade
  entidade_tipo: string
  resumo: string
  criado_em: string
}

interface ListaLogsApi {
  itens: LogApi[]
  total: number
}

// Máximo aceito pelo backend (LOG-03). A tela filtra e ordena só entre esses registros.
const LIMITE = 200

const VERBO: Record<AcaoApi, string> = { criar: 'Criou', editar: 'Editou', excluir: 'Excluiu' }

const ENTIDADE: Record<string, string> = {
  aviso: 'aviso',
  documento: 'documento',
  faq: 'pergunta',
  setor: 'setor',
  ramal: 'ramal',
  usuario: 'usuário',
  atalho: 'atalho',
}

function descreverAcao(bruto: LogApi): string {
  // Usuário não é apagado, só desativado (USU-04).
  const verbo =
    bruto.modulo === 'usuarios' && bruto.acao === 'excluir' ? 'Desativou' : VERBO[bruto.acao]
  return `${verbo} ${ENTIDADE[bruto.entidade_tipo] ?? bruto.entidade_tipo}`
}

function paraAtividade(bruto: LogApi): Atividade {
  return {
    id: bruto.id,
    criadoEm: bruto.criado_em,
    usuarioNome: bruto.usuario_nome,
    acao: descreverAcao(bruto),
    detalhe: bruto.resumo,
    area: bruto.modulo,
  }
}

export async function listarAtividades(): Promise<Atividade[]> {
  const { data } = await api.get<ListaLogsApi>('/logs', { params: { limite: LIMITE } })
  return data.itens.map(paraAtividade)
}
