import { IconeLapis, IconeLixeira, IconeMais, IconeMenos } from '../../../shared/components/icones'
import type { Faq } from '../types'

interface PropriedadesItemFaq {
  faq: Faq
  expandido: boolean
  aoAlternar: () => void
  podeGerenciar: boolean
  aoEditar: (faq: Faq) => void
  aoExcluir: (faq: Faq) => void
}

function ItemFaq({ faq, expandido, aoAlternar, podeGerenciar, aoEditar, aoExcluir }: PropriedadesItemFaq) {
  return (
    <div className="border-t border-slate-200/60 ios:border-slate-900/5 py-4 first:border-t-0">
      <button
        type="button"
        onClick={aoAlternar}
        className="flex w-full items-center gap-3 rounded-lg text-left sm:gap-4"
      >
        <span className="w-16 flex-none text-[11px] font-semibold tracking-wide text-slate-500 uppercase ios:text-xs ios:tracking-normal ios:normal-case">
          {faq.setorNome}
        </span>
        <span className="flex-1 text-[15px] font-semibold text-slate-900 ios:tracking-tight">{faq.pergunta}</span>
        <span className="flex size-10 flex-none items-center justify-center text-slate-500 sm:size-6">
          {expandido ? <IconeMenos tamanho={18} /> : <IconeMais tamanho={18} />}
        </span>
      </button>

      {expandido && (
        <div className="mt-3 sm:pl-20">
          {podeGerenciar && (
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => aoEditar(faq)}
                className="btn btn-secondary min-h-10 px-3 text-[13px] sm:min-h-8"
              >
                <IconeLapis tamanho={13} />
                Editar
              </button>
              <button
                type="button"
                onClick={() => aoExcluir(faq)}
                className="btn btn-danger min-h-10 px-3 text-[13px] sm:min-h-8"
              >
                <IconeLixeira tamanho={13} />
                Excluir
              </button>
            </div>
          )}
          <p className="m-0 text-sm leading-relaxed text-slate-700 ios:text-[15px]">{faq.resposta}</p>
        </div>
      )}
    </div>
  )
}

export default ItemFaq
