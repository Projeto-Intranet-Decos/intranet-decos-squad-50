import { IconePin, IconeUsuario } from '../../../shared/components/icones'
import type { Aviso } from '../types'

interface PropriedadesPainelFixados {
  fixados: Aviso[]
  aoAbrir: (aviso: Aviso) => void
}

function PainelFixados({ fixados, aoAbrir }: PropriedadesPainelFixados) {
  return (
    <div className="surface flex w-full flex-none flex-col overflow-hidden lg:w-[316px]">
      <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/40 px-[18px] py-3 ios:border-slate-900/5 ios:bg-transparent ios:px-5 ios:pt-4 ios:pb-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-600 ios:gap-2 ios:text-sm ios:tracking-[0.02em] ios:text-slate-900 ios:[&_svg]:size-[18px]">
          <IconePin tamanho={16} className="text-brand-600" />
          FIXADO
        </span>
      </div>
      <div className="flex flex-col px-[18px] pb-[18px] ios:px-2 ios:pb-2">
        {fixados.length === 0 && (
          <p className="m-0 pt-[18px] text-center text-[13px] text-slate-600 ios:py-6 ios:text-sm ios:text-slate-500">
            Nenhum aviso fixado no momento.
          </p>
        )}
        {fixados.map((aviso) => (
          <button
            key={aviso.id}
            type="button"
            onClick={() => aoAbrir(aviso)}
            className="-mx-[18px] border-t border-slate-200/60 px-[18px] py-3.5 text-left transition-colors first:border-t-0 hover:bg-white/60 ios:relative ios:mx-0 ios:rounded-inner ios:border-t-0 ios:px-3 ios:hover:bg-white/50 ios:[&+&]:before:absolute ios:[&+&]:before:top-0 ios:[&+&]:before:right-3 ios:[&+&]:before:left-12 ios:[&+&]:before:border-t ios:[&+&]:before:border-slate-900/5"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-[26px] flex-none items-center justify-center rounded-full bg-brand-100 text-brand-700 ios:size-7">
                <IconeUsuario tamanho={15} />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-[12.5px] font-semibold text-slate-900 ios:text-sm">{aviso.autorNome}</span>
                <span className="text-[11px] text-slate-500 ios:text-xs">{aviso.setorNome}</span>
              </div>
              <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-brand-600 ios:text-[11px] ios:font-semibold">
                <IconePin tamanho={13} />
                FIXADO
              </span>
            </div>
            {/* Evento pode não ter conteúdo; aí o título ocupa o lugar. */}
            <p className="m-0 line-clamp-2 text-[13px] leading-relaxed text-slate-700 ios:text-sm">
              {aviso.conteudo ?? aviso.titulo}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default PainelFixados
