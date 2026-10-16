import { useEffect, useRef } from 'react'
import { DIAS_SEMANA, montarGradeMes } from '../formatadoresCalendario'
import type { Aniversariante, Evento } from '../types'

interface PropriedadesVisaoMes {
  ano: number
  mes: number
  eventosPorDia: Map<string, Evento[]>
  aniversariantesDoDia: (data: Date) => Aniversariante[]
  aoAbrirEvento: (evento: Evento) => void
  /** Chave (AAAA-MM-DD) do dia que pisca ao chegar por "Ver no calendário" (MUR-15). */
  diaDestacado?: string | null
}

function VisaoMes({
  ano,
  mes,
  eventosPorDia,
  aniversariantesDoDia,
  aoAbrirEvento,
  diaDestacado,
}: PropriedadesVisaoMes) {
  const celulas = montarGradeMes(ano, mes)
  const celulaDestacadaRef = useRef<HTMLDivElement>(null)

  // No celular a grade rola na horizontal: traz o dia destacado para a tela.
  useEffect(() => {
    celulaDestacadaRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'center' })
  }, [diaDestacado])

  return (
    // Abaixo de lg a grade rola na horizontal dentro do card, sem esmagar os eventos.
    <div className="overflow-x-auto rounded-[10px] ios:rounded-inner border border-slate-200/60 ios:border-slate-900/5">
      <div className="grid min-w-[560px] grid-cols-7 lg:min-w-0">
        {DIAS_SEMANA.map((rotulo) => (
          <span
            key={rotulo}
            className="border-r border-b border-slate-200/60 ios:border-slate-900/5 bg-white/40 py-2.5 text-center text-[11px] tracking-wide text-slate-500 last:border-r-0"
          >
            {rotulo}
          </span>
        ))}

        {celulas.map((celula) => {
          const eventosDoDia = eventosPorDia.get(celula.chave) ?? []
          const aniversariantes = celula.dia !== null ? aniversariantesDoDia(new Date(ano, mes, celula.dia)) : []
          const destacado = celula.chave === diaDestacado

          return (
            <div
              key={celula.chave}
              ref={destacado ? celulaDestacadaRef : undefined}
              className={`relative flex min-h-[94px] min-w-0 flex-col ${destacado ? 'destaque-dia' : ''} gap-1.5 border-r border-b border-slate-200/60 ios:border-slate-900/5 px-[9px] py-2 [&:nth-child(7n)]:border-r-0 ${
                celula.dia === null ? 'bg-slate-900/[0.03]' : celula.hoje ? 'bg-brand-50/80' : 'bg-white/50'
              }`}
            >
              {celula.dia !== null && (
                <span className={`text-xs tabular-nums ${celula.hoje ? 'font-bold text-brand-600' : 'font-medium text-slate-600'}`}>
                  {String(celula.dia).padStart(2, '0')}
                </span>
              )}
              {eventosDoDia.map((evento) => (
                <button
                  key={evento.id}
                  type="button"
                  onClick={() => aoAbrirEvento(evento)}
                  title={evento.titulo}
                  className="min-w-0 cursor-pointer truncate rounded-md bg-brand-500 ios:rounded-lg px-1.5 py-1 text-left text-[11px] leading-snug text-white transition-colors hover:bg-brand-600"
                >
                  {evento.titulo}
                </button>
              ))}
              {aniversariantes.map((pessoa) => (
                <span
                  key={pessoa.id}
                  title={pessoa.nome}
                  className="min-w-0 truncate rounded-md bg-slate-900/5 ios:rounded-lg px-1.5 py-1 text-[11px] leading-snug text-slate-700"
                >
                  {pessoa.nome}
                </span>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default VisaoMes
