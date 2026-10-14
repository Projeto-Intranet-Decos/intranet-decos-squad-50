import { DIAS_SEMANA, montarGradeMes } from '../formatadoresCalendario'
import type { Aniversariante, Evento } from '../types'

interface PropriedadesVisaoMes {
  ano: number
  mes: number
  eventosPorDia: Map<string, Evento[]>
  aniversariantesDoDia: (data: Date) => Aniversariante[]
  aoAbrirEvento: (evento: Evento) => void
}

function VisaoMes({ ano, mes, eventosPorDia, aniversariantesDoDia, aoAbrirEvento }: PropriedadesVisaoMes) {
  const celulas = montarGradeMes(ano, mes)

  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-[10px] border border-slate-200">
      {DIAS_SEMANA.map((rotulo) => (
        <span
          key={rotulo}
          className="border-r border-b border-slate-200 bg-slate-50 py-2.5 text-center text-[10px] tracking-wide text-slate-500 last:border-r-0"
        >
          {rotulo}
        </span>
      ))}

      {celulas.map((celula) => {
        const eventosDoDia = eventosPorDia.get(celula.chave) ?? []
        const aniversariantes = celula.dia !== null ? aniversariantesDoDia(new Date(ano, mes, celula.dia)) : []

        return (
          <div
            key={celula.chave}
            className={`flex min-h-[94px] min-w-0 flex-col gap-1.5 border-r border-b border-slate-200 px-[9px] py-2 [&:nth-child(7n)]:border-r-0 ${
              celula.dia === null ? 'bg-slate-50' : celula.hoje ? 'bg-slate-100' : 'bg-white'
            }`}
          >
            {celula.dia !== null && (
              <span className={`text-[11.5px] ${celula.hoje ? 'font-bold text-[#800020]' : 'font-medium text-slate-600'}`}>
                {String(celula.dia).padStart(2, '0')}
              </span>
            )}
            {eventosDoDia.map((evento) => (
              <button
                key={evento.id}
                type="button"
                onClick={() => aoAbrirEvento(evento)}
                title={evento.titulo}
                className="min-w-0 cursor-pointer truncate rounded-md bg-[#b33951] px-1.5 py-1 text-left text-[10.5px] leading-snug text-white hover:bg-[#800020]"
              >
                {evento.titulo}
              </button>
            ))}
            {aniversariantes.map((pessoa) => (
              <span
                key={pessoa.id}
                title={pessoa.nome}
                className="min-w-0 truncate rounded-md bg-slate-100 px-1.5 py-1 text-[10.5px] leading-snug text-slate-700"
              >
                {pessoa.nome}
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default VisaoMes
