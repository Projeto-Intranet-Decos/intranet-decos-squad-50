import CabecalhoOrdenavel from '../../../shared/components/CabecalhoOrdenavel'
import { IconeLapis, IconeLixeira } from '../../../shared/components/icones'
import Skeleton from '../../../shared/components/Skeleton'
import type { DirecaoOrdenacao } from '../../../shared/hooks/useOrdenacaoClique'
import type { OrdemSetores, SetorComRamais } from '../types'

interface PropriedadesTabelaSetores {
  setores: SetorComRamais[]
  isLoading: boolean
  ordem: OrdemSetores
  direcao: DirecaoOrdenacao
  aoClicarColuna: (coluna: OrdemSetores) => void
  podeEditarSetor: (setor: SetorComRamais) => boolean
  podeExcluir: boolean
  aoEditar: (setor: SetorComRamais) => void
  aoExcluir: (setor: SetorComRamais) => void
}

const COLUNAS = 'grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_76px] sm:gap-[18px]'
const CLASSE_CABECALHO = 'text-xs font-medium tracking-wide uppercase liquido:font-semibold liquido:tracking-normal liquido:normal-case'
const LINHAS_SKELETON = 5

function LinhaSkeleton({ indice }: { indice: number }) {
  return (
    <div className={`${COLUNAS} -mx-4 items-center tabela-linha px-4 py-[13px] sm:-mx-6 sm:px-6`}>
      <Skeleton className={`h-4 ${indice % 2 === 0 ? 'w-32' : 'w-24'}`} />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-5 w-12" />
      </div>
      <div />
    </div>
  )
}

function TabelaSetores({
  setores,
  isLoading,
  ordem,
  direcao,
  aoClicarColuna,
  podeEditarSetor,
  podeExcluir,
  aoEditar,
  aoExcluir,
}: PropriedadesTabelaSetores) {
  return (
    <div className="surface overflow-hidden px-4 pb-2 sm:px-6">
      <div className={`${COLUNAS} -mx-4 tabela-cabecalho px-4 py-3 sm:-mx-6 sm:px-6`}>
        <CabecalhoOrdenavel
          rotulo="Setor"
          ativo={ordem === 'nome'}
          direcao={direcao}
          aoClicar={() => aoClicarColuna('nome')}
          className={CLASSE_CABECALHO}
        />
        <CabecalhoOrdenavel
          rotulo="Ramais"
          ativo={ordem === 'ramal'}
          direcao={direcao}
          aoClicar={() => aoClicarColuna('ramal')}
          className={CLASSE_CABECALHO}
        />
        <span className={`text-right ${CLASSE_CABECALHO}`}>Ações</span>
      </div>

      {isLoading && Array.from({ length: LINHAS_SKELETON }, (_, indice) => <LinhaSkeleton key={indice} indice={indice} />)}

      {!isLoading && setores.length === 0 && (
        <p className="m-0 py-10 text-center text-sm text-slate-600">Nenhum setor encontrado.</p>
      )}

      {!isLoading && setores.map((setor) => (
        <div
          key={setor.id}
          className={`${COLUNAS} -mx-4 items-center tabela-linha px-4 py-[13px] sm:-mx-6 sm:px-6`}
        >
          <span className="text-sm font-medium text-slate-900 liquido:text-[15px]">{setor.nome}</span>
          <div className="flex flex-wrap gap-1.5">
            {setor.ramais.length === 0 && <span className="text-[13px] text-slate-500">—</span>}
            {setor.ramais.map((ramal) => (
              <span
                key={ramal.id}
                className="rounded-md bg-brand-50 px-[9px] py-[3px] liquido:rounded-full liquido:px-2.5 font-mono text-[13px] font-medium text-brand-700 tabular-nums ring-1 ring-brand-100"
              >
                {ramal.numero}
              </span>
            ))}
          </div>
          <div className="flex justify-end gap-0.5">
            {podeEditarSetor(setor) && (
              <button
                type="button"
                onClick={() => aoEditar(setor)}
                title="Editar"
                className="flex size-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-700 sm:size-7 liquido:btn-icon"
              >
                <IconeLapis tamanho={15} />
              </button>
            )}
            {podeExcluir && (
              <button
                type="button"
                onClick={() => aoExcluir(setor)}
                title="Excluir"
                className="flex size-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-danger-50 hover:text-danger-600 sm:size-7 liquido:btn-icon is-danger"
              >
                <IconeLixeira tamanho={15} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default TabelaSetores
