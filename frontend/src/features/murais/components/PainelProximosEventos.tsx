import { IconeCalendario } from '../../../shared/components/icones'
import { formatarDiaMes, formatarHora } from '../formatadores'
import type { Evento } from '../types'

interface PropriedadesPainelProximosEventos {
  eventos: Evento[]
  aoAbrir: (evento: Evento) => void
}

function descreverHorario(evento: Evento): string {
  const inicio = formatarHora(evento.dataInicio)
  if (!evento.dataFim) return inicio
  // O dia de início já aparece no quadrinho ao lado; evento de vários dias mostra até quando vai.
  if (formatarDiaMes(evento.dataFim) !== formatarDiaMes(evento.dataInicio)) {
    return `${inicio} até ${formatarDiaMes(evento.dataFim)} ${formatarHora(evento.dataFim)}`
  }
  return `${inicio} às ${formatarHora(evento.dataFim)}`
}

function descreverEvento(evento: Evento): string {
  const horario = descreverHorario(evento)
  const conteudo = evento.conteudo?.trim()
  return conteudo ? `${horario} · ${conteudo}` : horario
}

function PainelProximosEventos({ eventos, aoAbrir }: PropriedadesPainelProximosEventos) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden surface">
      <div className="flex items-center border-b border-slate-200/60 bg-white/40 px-[18px] py-3 ios:border-slate-900/5 ios:bg-transparent ios:px-5 ios:pt-4 ios:pb-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-600 ios:gap-2 ios:text-sm ios:tracking-[0.02em] ios:text-slate-900 ios:[&_svg]:size-[18px]">
          <IconeCalendario tamanho={16} className="text-brand-600" />
          PRÓXIMOS EVENTOS
        </span>
      </div>
      <div className="flex flex-col gap-3 px-[18px] pt-3.5 pb-[18px] ios:gap-0 ios:px-3 ios:pt-1 ios:pb-3">
        {eventos.length === 0 && (
          <p className="m-0 py-3 text-center text-[13px] text-slate-600 ios:py-6 ios:text-sm ios:text-slate-500">Nenhum evento programado.</p>
        )}
        {eventos.map((evento) => {
          const [dia, mes] = formatarDiaMes(evento.dataInicio).split(' ')
          return (
            <button
              key={evento.id}
              type="button"
              onClick={() => aoAbrir(evento)}
              className="relative -mx-2 flex cursor-pointer gap-3 rounded-[10px] px-2 py-1 text-left transition-colors hover:bg-white/60 ios:mx-0 ios:items-center ios:rounded-inner ios:py-2 ios:hover:bg-white/50 ios:[&+&]:before:absolute ios:[&+&]:before:top-0 ios:[&+&]:before:right-2 ios:[&+&]:before:left-[4.25rem] ios:[&+&]:before:border-t ios:[&+&]:before:border-slate-900/5"
            >
              {/* Quadrinho da data: no iOS, o "tile" do calendário do iPhone. */}
              <div className="w-[46px] flex-none rounded-[10px] bg-white/55 px-0 py-[7px] text-center ring-1 ring-white/80 ios:w-12 ios:rounded-tile ios:bg-white/60 ios:py-1.5 ios:shadow-[inset_0_1px_0_white]">
                <div className="text-[15px] leading-none font-medium text-slate-900 tabular-nums ios:text-lg ios:font-semibold">{dia}</div>
                <div className="mt-0.5 text-[10px] tracking-wide text-slate-500 ios:mt-0 ios:text-[11px] ios:font-semibold ios:text-brand-600">{mes}</div>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13px] font-semibold text-slate-900 ios:text-[15px]">{evento.titulo}</span>
                <span className="truncate text-xs text-slate-500 ios:text-[13px]">{descreverEvento(evento)}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default PainelProximosEventos
