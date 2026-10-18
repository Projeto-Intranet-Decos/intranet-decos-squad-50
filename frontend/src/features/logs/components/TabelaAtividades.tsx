import CabecalhoOrdenavel from '../../../shared/components/CabecalhoOrdenavel'
import Skeleton from '../../../shared/components/Skeleton'
import type { DirecaoOrdenacao } from '../../../shared/hooks/useOrdenacaoClique'
import { formatarDataHora } from '../formatadores'
import { ROTULO_AREA, type Atividade, type ColunaAtividade } from '../types'

interface PropriedadesTabelaAtividades {
  atividades: Atividade[]
  isLoading: boolean
  ordenarPor: ColunaAtividade
  direcao: DirecaoOrdenacao
  aoClicarColuna: (coluna: ColunaAtividade) => void
}

const COLUNAS: { coluna: ColunaAtividade; titulo: string; largura: string }[] = [
  { coluna: 'data', titulo: 'Data', largura: 'w-[19%]' },
  { coluna: 'usuario', titulo: 'Usuário', largura: 'w-[22%]' },
  { coluna: 'acao', titulo: 'Ação', largura: '' },
  { coluna: 'area', titulo: 'Área', largura: 'w-[16%]' },
]

const LINHAS_SKELETON = 6

function LinhaSkeleton({ indice }: { indice: number }) {
  return (
    <tr>
      <td className="px-6 py-4"><Skeleton className="h-3.5 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className={`h-4 ${indice % 2 === 0 ? 'w-32' : 'w-24'}`} /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-48" /><Skeleton className="mt-1.5 h-3 w-32" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
    </tr>
  )
}

function TabelaAtividades({ atividades, isLoading, ordenarPor, direcao, aoClicarColuna }: PropriedadesTabelaAtividades) {
  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead className="tabela-cabecalho">
            <tr className="text-xs font-medium tracking-wide uppercase liquido:tracking-normal liquido:normal-case">
              {COLUNAS.map(({ coluna, titulo, largura }) => (
                <th
                  key={coluna}
                  scope="col"
                  aria-sort={ordenarPor === coluna ? (direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={`${largura} px-6 py-3.5 font-medium liquido:font-semibold`}
                >
                  <CabecalhoOrdenavel rotulo={titulo} ativo={ordenarPor === coluna} direcao={direcao} aoClicar={() => aoClicarColuna(coluna)} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: LINHAS_SKELETON }, (_, indice) => <LinhaSkeleton key={indice} indice={indice} />)
            ) : atividades.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-600">
                  Nenhuma atividade encontrada.
                </td>
              </tr>
            ) : (
              atividades.map((atividade) => (
                <tr key={atividade.id} className="tabela-linha">
                  <td className="px-6 py-4 font-mono text-[13px] whitespace-nowrap text-slate-600 tabular-nums">
                    <time dateTime={atividade.criadoEm}>{formatarDataHora(atividade.criadoEm)}</time>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{atividade.usuarioNome}</td>
                  <td className="px-6 py-4">
                    <p className="m-0 text-sm text-slate-800">{atividade.acao}</p>
                    <p className="m-0 mt-0.5 text-[13px] text-slate-500">{atividade.detalhe}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block rounded-full bg-brand-50 px-2.5 py-1 text-xs whitespace-nowrap text-brand-700 ring-1 ring-brand-100 liquido:pill liquido:bg-brand-600/8 liquido:ring-brand-600/10">
                      {ROTULO_AREA[atividade.area]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TabelaAtividades
