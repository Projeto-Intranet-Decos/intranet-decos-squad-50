import { IconeLapis, IconeLixeira } from '../../../shared/components/icones'
import type { SetorComRamais } from '../types'

interface PropriedadesTabelaSetores {
  setores: SetorComRamais[]
  podeEditarSetor: (setor: SetorComRamais) => boolean
  podeExcluir: boolean
  aoEditar: (setor: SetorComRamais) => void
  aoExcluir: (setor: SetorComRamais) => void
}

const COLUNAS = 'grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_76px] sm:gap-[18px]'

function TabelaSetores({ setores, podeEditarSetor, podeExcluir, aoEditar, aoExcluir }: PropriedadesTabelaSetores) {
  return (
    <div className="surface overflow-hidden px-4 pb-2 sm:px-6">
      <div className={`${COLUNAS} -mx-4 border-b border-slate-200/60 liquido:border-slate-900/5 bg-white/40 px-4 py-3 liquido:bg-white/35 sm:-mx-6 sm:px-6`}>
        <span className="text-xs font-medium tracking-wide text-slate-500 uppercase liquido:font-semibold liquido:tracking-normal liquido:normal-case">Setor</span>
        <span className="text-xs font-medium tracking-wide text-slate-500 uppercase liquido:font-semibold liquido:tracking-normal liquido:normal-case">Ramais</span>
        <span className="text-right text-xs font-medium tracking-wide text-slate-500 uppercase liquido:font-semibold liquido:tracking-normal liquido:normal-case">Ações</span>
      </div>

      {setores.length === 0 && (
        <p className="m-0 py-10 text-center text-sm text-slate-600">Nenhum setor encontrado.</p>
      )}

      {setores.map((setor) => (
        <div
          key={setor.id}
          className={`${COLUNAS} -mx-4 items-center border-b border-slate-200/60 liquido:border-slate-900/5 px-4 py-[13px] transition-colors last:border-b-0 hover:bg-white/60 liquido:hover:bg-white/50 sm:-mx-6 sm:px-6`}
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
