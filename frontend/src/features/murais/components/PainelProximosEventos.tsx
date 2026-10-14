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
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_1px_2px_rgba(30,42,50,0.04),0_10px_22px_-16px_rgba(30,42,50,0.18)]">
      <div className="flex items-center bg-[#800020] px-[18px] py-3">
        <span className="flex items-center gap-1.5 text-[10.5px] font-medium tracking-wide text-white">
          <IconeCalendario tamanho={14} />
          PRÓXIMOS EVENTOS
        </span>
      </div>
      <div className="flex flex-col gap-3 px-[18px] pt-3.5 pb-[18px]">
        {eventos.length === 0 && (
          <p className="m-0 py-3 text-center text-[12.5px] text-slate-500">Nenhum evento programado.</p>
        )}
        {eventos.map((evento) => {
          const [dia, mes] = formatarDiaMes(evento.dataInicio).split(' ')
          return (
            <button
              key={evento.id}
              type="button"
              onClick={() => aoAbrir(evento)}
              className="-mx-2 flex cursor-pointer gap-3 rounded-[10px] px-2 py-1 text-left hover:bg-slate-50"
            >
              <div className="flex-none rounded-[10px] bg-slate-50 px-0 py-[7px] text-center" style={{ width: 46 }}>
                <div className="text-[15px] leading-none font-medium text-slate-900">{dia}</div>
                <div className="mt-0.5 text-[9.5px] tracking-wide text-slate-400">{mes}</div>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13px] font-semibold text-slate-900">{evento.titulo}</span>
                <span className="truncate text-[11.5px] text-slate-500">{descreverEvento(evento)}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default PainelProximosEventos
