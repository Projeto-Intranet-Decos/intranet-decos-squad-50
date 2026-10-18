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
      <div className="tabela-cabecalho flex items-center px-[18px] py-3 liquido:px-5 liquido:pt-4 liquido:pb-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide liquido:gap-2 uppercase liquido:text-[15px] liquido:tracking-normal liquido:normal-case liquido:[&_svg]:size-[18px]">
          <IconeCalendario tamanho={16} />
          Próximos eventos
        </span>
      </div>
      <div className="flex flex-col gap-3 px-[18px] pt-3.5 pb-[18px] liquido:gap-0 liquido:px-3 liquido:pt-1 liquido:pb-3">
        {eventos.length === 0 && (
          <p className="m-0 py-3 text-center text-[13px] text-slate-600 liquido:py-6 liquido:text-sm liquido:text-slate-500">Nenhum evento programado.</p>
        )}
        {eventos.map((evento) => {
          const [dia, mes] = formatarDiaMes(evento.dataInicio).split(' ')
          return (
            <button
              key={evento.id}
              type="button"
              onClick={() => aoAbrir(evento)}
              className="relative -mx-2 flex cursor-pointer gap-3 rounded-[10px] px-2 py-1 text-left transition-colors hover:bg-white/60 liquido:mx-0 liquido:items-center liquido:rounded-inner liquido:py-2 liquido:hover:bg-white/50 liquido:[&+&]:before:absolute liquido:[&+&]:before:top-0 liquido:[&+&]:before:right-2 liquido:[&+&]:before:left-[4.25rem] liquido:[&+&]:before:border-t liquido:[&+&]:before:border-slate-900/5"
            >
              {/* Quadrinho da data: no Vidro líquido, um "tile" de calendário. */}
              <div className="w-[46px] flex-none rounded-[10px] bg-white/55 px-0 py-[7px] text-center ring-1 ring-white/80 liquido:w-12 liquido:rounded-tile liquido:bg-white/60 liquido:py-1.5 liquido:shadow-[inset_0_1px_0_white]">
                <div className="text-[15px] leading-none font-medium text-slate-900 tabular-nums liquido:text-lg liquido:font-semibold">{dia}</div>
                <div className="mt-0.5 text-[10px] tracking-wide text-slate-500 liquido:mt-0 liquido:text-[11px] liquido:font-semibold liquido:text-brand-600">{mes}</div>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13px] font-semibold text-slate-900 liquido:text-[15px]">{evento.titulo}</span>
                <span className="truncate text-xs text-slate-500 liquido:text-[13px]">{descreverEvento(evento)}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default PainelProximosEventos
