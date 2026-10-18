import { IconeDuvida, IconeLupa } from '../../../shared/components/icones'
import Skeleton from '../../../shared/components/Skeleton'
import type { Faq } from '../types'
import ListaFaq from './ListaFaq'

interface PropriedadesPainelFaq {
  busca: string
  aoMudarBusca: (valor: string) => void
  itens: Faq[]
  isLoading: boolean
  expandidoId: string | null
  aoAlternar: (id: string) => void
  podeGerenciar: (faq: Faq) => boolean
  aoEditar: (faq: Faq) => void
  aoExcluir: (faq: Faq) => void
}

function ItemFaqSkeleton({ indice }: { indice: number }) {
  return (
    <div className="flex items-center gap-3 border-t border-slate-200/60 py-4 first:border-t-0 sm:gap-4 liquido:border-slate-900/5">
      <Skeleton className="h-3 w-12 flex-none" />
      <Skeleton className={`h-4 ${indice % 2 === 0 ? 'w-72' : 'w-56'}`} />
    </div>
  )
}

function PainelFaq({
  busca,
  aoMudarBusca,
  itens,
  isLoading,
  expandidoId,
  aoAlternar,
  podeGerenciar,
  aoEditar,
  aoExcluir,
}: PropriedadesPainelFaq) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden surface">
      <div className="flex items-center gap-1.5 border-b border-slate-200/60 bg-white/40 px-[18px] py-3 liquido:gap-2 liquido:border-slate-900/5 liquido:bg-transparent liquido:px-5 liquido:pt-4 liquido:pb-3">
        <IconeDuvida tamanho={16} className="text-brand-600 liquido:size-[18px]" />
        <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase liquido:text-[15px] liquido:tracking-normal liquido:normal-case liquido:text-slate-900">
          Perguntas frequentes
        </span>
      </div>

      <div className="px-[18px] pt-[18px] pb-[18px] liquido:px-5 liquido:pt-4">
        <label className="relative mb-1 block">
          <IconeLupa
            tamanho={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-500 liquido:left-4"
          />
          <input
            value={busca}
            onChange={(e) => aoMudarBusca(e.target.value)}
            placeholder="Qual é a sua dúvida?"
            className="field py-2.5 pl-[38px] text-[13.5px] liquido:capsule-field liquido:pl-10 liquido:text-sm"
          />
        </label>

        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: 4 }, (_, indice) => <ItemFaqSkeleton key={indice} indice={indice} />)}
          </div>
        ) : (
          <ListaFaq
            itens={itens}
            expandidoId={expandidoId}
            aoAlternar={aoAlternar}
            podeGerenciar={podeGerenciar}
            aoEditar={aoEditar}
            aoExcluir={aoExcluir}
          />
        )}
      </div>
    </div>
  )
}

export default PainelFaq
