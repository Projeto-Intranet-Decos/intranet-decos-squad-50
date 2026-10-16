import { IconeDuvida, IconeLupa } from '../../../shared/components/icones'
import type { Faq } from '../types'
import ListaFaq from './ListaFaq'

interface PropriedadesPainelFaq {
  busca: string
  aoMudarBusca: (valor: string) => void
  itens: Faq[]
  expandidoId: string | null
  aoAlternar: (id: string) => void
  podeGerenciar: (faq: Faq) => boolean
  aoEditar: (faq: Faq) => void
  aoExcluir: (faq: Faq) => void
}

function PainelFaq({
  busca,
  aoMudarBusca,
  itens,
  expandidoId,
  aoAlternar,
  podeGerenciar,
  aoEditar,
  aoExcluir,
}: PropriedadesPainelFaq) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden surface">
      <div className="flex items-center gap-1.5 border-b border-slate-200/60 bg-white/40 px-[18px] py-3 ios:gap-2 ios:border-slate-900/5 ios:bg-transparent ios:px-5 ios:pt-4 ios:pb-3">
        <IconeDuvida tamanho={16} className="text-brand-600 ios:size-[18px]" />
        <span className="text-xs font-semibold tracking-wide text-slate-600 ios:text-sm ios:tracking-[0.02em] ios:text-slate-900">
          PERGUNTAS FREQUENTES
        </span>
      </div>

      <div className="px-[18px] pt-[18px] pb-[18px] ios:px-5 ios:pt-4">
        <label className="relative mb-1 block">
          <IconeLupa
            tamanho={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-500 ios:left-4"
          />
          <input
            value={busca}
            onChange={(e) => aoMudarBusca(e.target.value)}
            placeholder="Qual é a sua dúvida?"
            className="field py-2.5 pl-[38px] text-[13.5px] ios:capsule-field ios:pl-10 ios:text-sm"
          />
        </label>

        <ListaFaq
          itens={itens}
          expandidoId={expandidoId}
          aoAlternar={aoAlternar}
          podeGerenciar={podeGerenciar}
          aoEditar={aoEditar}
          aoExcluir={aoExcluir}
        />
      </div>
    </div>
  )
}

export default PainelFaq
