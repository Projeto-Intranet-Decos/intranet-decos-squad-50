import { IconePin, IconeUsuario } from '../../../shared/components/icones'
import type { Aviso } from '../types'

interface PropriedadesPainelFixados {
  fixados: Aviso[]
  aoAbrir: (aviso: Aviso) => void
}

function PainelFixados({ fixados, aoAbrir }: PropriedadesPainelFixados) {
  return (
    <div className="surface flex w-full flex-none flex-col overflow-hidden lg:w-[316px]">
      <div className="tabela-cabecalho flex items-center justify-between px-[18px] py-3 liquido:px-5 liquido:pt-4 liquido:pb-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide liquido:gap-2 uppercase liquido:text-[15px] liquido:tracking-normal liquido:normal-case liquido:[&_svg]:size-[18px]">
          <IconePin tamanho={16} />
          Fixado
        </span>
      </div>
      <div className="flex flex-col px-[18px] pb-[18px] liquido:px-2 liquido:pb-2">
        {fixados.length === 0 && (
          <p className="m-0 pt-[18px] text-center text-[13px] text-slate-600 liquido:py-6 liquido:text-sm liquido:text-slate-500">
            Nenhum aviso fixado no momento.
          </p>
        )}
        {fixados.map((aviso) => (
          <button
            key={aviso.id}
            type="button"
            onClick={() => aoAbrir(aviso)}
            className="-mx-[18px] border-t border-slate-200/60 px-[18px] py-3.5 text-left transition-colors first:border-t-0 hover:bg-white/60 liquido:relative liquido:mx-0 liquido:rounded-inner liquido:border-t-0 liquido:px-3 liquido:hover:bg-white/50 liquido:[&+&]:before:absolute liquido:[&+&]:before:top-0 liquido:[&+&]:before:right-3 liquido:[&+&]:before:left-12 liquido:[&+&]:before:border-t liquido:[&+&]:before:border-slate-900/5"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-[26px] flex-none items-center justify-center rounded-full bg-brand-100 text-brand-700 liquido:size-7">
                <IconeUsuario tamanho={15} />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-[12.5px] font-semibold text-slate-900 liquido:text-sm">{aviso.autorNome}</span>
                <span className="text-[11px] text-slate-500 liquido:text-xs">{aviso.setorNome}</span>
              </div>
            </div>
            {/* Evento pode não ter conteúdo; aí o título ocupa o lugar. */}
            <p className="m-0 line-clamp-2 text-[13px] leading-relaxed text-slate-700 liquido:text-sm">
              {aviso.conteudo ?? aviso.titulo}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default PainelFixados
