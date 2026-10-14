import { NOMES_MESES } from '../formatadores'
import { montarGradeMes } from '../formatadoresCalendario'
import type { Aniversariante, Evento } from '../types'

interface PropriedadesVisaoAno {
  ano: number
  eventosPorDia: Map<string, Evento[]>
  aniversariantesDoDia: (data: Date) => Aniversariante[]
  aoAbrirMes: (mes: number) => void
}

function VisaoAno({ ano, eventosPorDia, aniversariantesDoDia, aoAbrirMes }: PropriedadesVisaoAno) {
  const hoje = new Date()
  const meses = NOMES_MESES.map((nome, mes) => {
    const celulas = montarGradeMes(ano, mes).map((celula) => ({
      ...celula,
      eventos: eventosPorDia.get(celula.chave)?.length ?? 0,
      aniversarios: celula.dia !== null ? aniversariantesDoDia(new Date(ano, mes, celula.dia)).length : 0,
    }))
    return {
      nome,
      mes,
      celulas,
      atual: ano === hoje.getFullYear() && mes === hoje.getMonth(),
      // Evento de vários dias aparece em cada dia, mas conta uma vez só no total do mês.
      totalEventos: new Set(celulas.flatMap((celula) => eventosPorDia.get(celula.chave) ?? []).map((e) => e.id))
        .size,
      totalAniversarios: celulas.reduce((soma, celula) => soma + celula.aniversarios, 0),
    }
  })

  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2 xl:grid-cols-3">
      {meses.map((item) => (
        <button
          key={item.mes}
          type="button"
          onClick={() => aoAbrirMes(item.mes)}
          title={`Abrir ${item.nome}`}
          className="cursor-pointer rounded-[10px] border border-slate-200 bg-slate-50 px-3 pt-3 pb-3.5 text-left transition-colors hover:border-slate-300"
        >
          <span className="mb-[9px] flex h-[18px] items-baseline justify-between gap-2.5">
            <span className={`text-[12.5px] font-bold whitespace-nowrap ${item.atual ? 'text-[#800020]' : 'text-slate-800'}`}>
              {item.nome}
            </span>
            <span className="text-[9.5px] whitespace-nowrap text-slate-400">
              {item.totalEventos} ev · {item.totalAniversarios} aniv
            </span>
          </span>
          <span className="grid grid-cols-7 gap-0.5">
            {item.celulas.map((celula) => (
              <span
                key={celula.chave}
                className={`flex h-[19px] items-center justify-center rounded-md text-[9.5px] ${
                  celula.eventos > 0
                    ? 'bg-[#b33951] font-medium text-white'
                    : celula.aniversarios > 0
                      ? 'bg-slate-100 font-medium text-slate-600'
                      : 'text-slate-400'
                }`}
              >
                {celula.dia ?? ''}
              </span>
            ))}
          </span>
        </button>
      ))}
    </div>
  )
}

export default VisaoAno
