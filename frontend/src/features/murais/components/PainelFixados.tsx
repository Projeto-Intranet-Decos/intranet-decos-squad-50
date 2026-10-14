import { IconePin, IconeUsuario } from '../../../shared/components/icones'
import type { Aviso } from '../types'

interface PropriedadesPainelFixados {
  fixados: Aviso[]
  aoAbrir: (aviso: Aviso) => void
}

function PainelFixados({ fixados, aoAbrir }: PropriedadesPainelFixados) {
  return (
    <div className="flex w-[316px] flex-none flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_1px_2px_rgba(30,42,50,0.04),0_10px_22px_-16px_rgba(30,42,50,0.18)]">
      <div className="flex items-center justify-between bg-[#800020] px-[18px] py-3">
        <span className="flex items-center gap-1.5 text-[10.5px] tracking-wide text-white">
          <IconePin tamanho={14} />
          FIXADO
        </span>
      </div>
      <div className="flex flex-col px-[18px] pb-[18px]">
        {fixados.length === 0 && (
          <p className="m-0 pt-[18px] text-center text-[12.5px] text-slate-500">Nenhum aviso fixado no momento.</p>
        )}
        {fixados.map((aviso) => (
          <button
            key={aviso.id}
            type="button"
            onClick={() => aoAbrir(aviso)}
            className="border-t border-slate-100 py-3.5 text-left first:border-t-0 hover:bg-slate-50"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-slate-300 text-white">
                <IconeUsuario tamanho={15} />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-[12.5px] font-semibold text-slate-900">{aviso.autorNome}</span>
                <span className="text-[10.5px] text-slate-500">{aviso.setorNome}</span>
              </div>
              <span className="ml-auto flex items-center gap-1 text-[9.5px] text-[#800020]">
                <IconePin tamanho={13} />
                FIXADO
              </span>
            </div>
            {/* Evento pode não ter conteúdo; aí o título ocupa o lugar. */}
            <p className="m-0 line-clamp-2 text-[12.5px] leading-relaxed text-slate-700">
              {aviso.conteudo ?? aviso.titulo}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default PainelFixados
