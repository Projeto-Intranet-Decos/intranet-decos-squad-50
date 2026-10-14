import { Fragment } from 'react'
import { formatarHora } from '../formatadores'
import { DIAS_SEMANA, chaveDeData, comecaNoDia, diasDaSemana, faixaDeHoras, rotuloHora } from '../formatadoresCalendario'
import type { Aniversariante, Evento } from '../types'

interface PropriedadesVisaoSemana {
  data: Date
  eventosPorDia: Map<string, Evento[]>
  aniversariantesDoDia: (data: Date) => Aniversariante[]
  aoAbrirEvento: (evento: Evento) => void
}

function VisaoSemana({ data, eventosPorDia, aniversariantesDoDia, aoAbrirEvento }: PropriedadesVisaoSemana) {
  const chaveHoje = chaveDeData(new Date())
  const colunas = diasDaSemana(data).map((dia) => {
    const chave = chaveDeData(dia)
    const eventosDoDia = eventosPorDia.get(chave) ?? []
    return {
      chave,
      dia,
      hoje: chave === chaveHoje,
      eventos: eventosDoDia.filter((evento) => comecaNoDia(evento, chave)),
      // Evento de vários dias: depois do primeiro dia, ocupa a faixa "Dia todo".
      continuacoes: eventosDoDia.filter((evento) => !comecaNoDia(evento, chave)),
      aniversariantes: aniversariantesDoDia(dia),
    }
  })
  const horas = faixaDeHoras(colunas.flatMap((coluna) => coluna.eventos))
  const temDiaTodo = colunas.some(
    (coluna) => coluna.aniversariantes.length > 0 || coluna.continuacoes.length > 0,
  )

  function classesCelula(indice: number, hoje: boolean) {
    return `flex min-w-0 flex-col gap-1 border-b border-slate-100 p-1 ${indice < 6 ? 'border-r' : ''} ${
      hoje ? 'bg-slate-50' : 'bg-white'
    }`
  }

  const classesRotulo =
    'border-r border-b border-r-slate-200 border-b-slate-100 bg-slate-50 px-2.5 py-2 text-right text-[11px] text-slate-400'

  return (
    <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] overflow-hidden rounded-[10px] border border-slate-200">
      <span className="border-r border-b border-slate-200 bg-slate-50" />
      {colunas.map((coluna, indice) => (
        <div
          key={coluna.chave}
          className={`border-b border-slate-200 py-[9px] text-center ${indice < 6 ? 'border-r' : ''} ${
            coluna.hoje ? 'bg-slate-100' : 'bg-slate-50'
          }`}
        >
          <div className="text-[10px] tracking-wide text-slate-400">{DIAS_SEMANA[indice]}</div>
          <div className={`text-[17px] ${coluna.hoje ? 'font-bold text-[#800020]' : 'font-medium text-slate-800'}`}>
            {String(coluna.dia.getDate()).padStart(2, '0')}
          </div>
        </div>
      ))}

      {temDiaTodo && (
        <>
          <span className={classesRotulo}>Dia todo</span>
          {colunas.map((coluna, indice) => (
            <div key={`dia-todo-${coluna.chave}`} className={classesCelula(indice, coluna.hoje)}>
              {coluna.continuacoes.map((evento) => (
                <button
                  key={evento.id}
                  type="button"
                  onClick={() => aoAbrirEvento(evento)}
                  title={evento.titulo}
                  className="min-w-0 cursor-pointer truncate rounded-md bg-[#b33951] px-1.5 py-[5px] text-left text-[10.5px] leading-snug text-white hover:bg-[#800020]"
                >
                  {evento.titulo}
                </button>
              ))}
              {coluna.aniversariantes.map((pessoa) => (
                <div
                  key={pessoa.id}
                  title={`Aniversário · ${pessoa.nome}`}
                  className="min-w-0 truncate rounded-md bg-slate-100 px-1.5 py-[5px] text-[10.5px] leading-snug text-slate-600"
                >
                  Aniversário · {pessoa.nome}
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {horas.map((hora) => (
        <Fragment key={hora}>
          <span className={classesRotulo}>{rotuloHora(hora)}</span>
          {colunas.map((coluna, indice) => (
            <div key={`${hora}-${coluna.chave}`} className={`min-h-[52px] ${classesCelula(indice, coluna.hoje)}`}>
              {coluna.eventos
                .filter((evento) => new Date(evento.dataInicio).getHours() === hora)
                .map((evento) => (
                  <button
                    key={evento.id}
                    type="button"
                    onClick={() => aoAbrirEvento(evento)}
                    title={evento.titulo}
                    className="min-w-0 cursor-pointer truncate rounded-md bg-[#b33951] px-1.5 py-[5px] text-left text-[10.5px] leading-snug text-white hover:bg-[#800020]"
                  >
                    <div className="text-[9.5px] opacity-75">{formatarHora(evento.dataInicio)}</div>
                    {evento.titulo}
                  </button>
                ))}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  )
}

export default VisaoSemana
