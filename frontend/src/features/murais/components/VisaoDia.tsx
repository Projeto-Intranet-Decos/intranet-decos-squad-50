import type { ReactNode } from 'react'
import { chaveDeData, comecaNoDia, faixaDeHoras, formatarIntervaloHoras, rotuloHora } from '../formatadoresCalendario'
import type { Aniversariante, Evento } from '../types'

interface PropriedadesVisaoDia {
  data: Date
  eventosPorDia: Map<string, Evento[]>
  aniversariantesDoDia: (data: Date) => Aniversariante[]
  aoAbrirEvento: (evento: Evento) => void
}

interface PropriedadesLinhaHorario {
  rotulo: string
  children: ReactNode
}

interface PropriedadesItemAgenda {
  horario: string
  titulo: string
  detalhe: string
  destaque: boolean
  aoClicar?: () => void
}

function LinhaHorario({ rotulo, children }: PropriedadesLinhaHorario) {
  return (
    <div className="grid min-h-[58px] grid-cols-[76px_minmax(0,1fr)] border-b border-slate-100 last:border-b-0">
      <span className="border-r border-slate-100 bg-slate-50 px-3 py-[9px] text-right text-[11px] text-slate-400">
        {rotulo}
      </span>
      <div className="flex flex-col gap-1.5 px-2.5 py-[7px]">{children}</div>
    </div>
  )
}

function ItemAgenda({ horario, titulo, detalhe, destaque, aoClicar }: PropriedadesItemAgenda) {
  return (
    <div
      onClick={aoClicar}
      className={`flex items-baseline gap-3 rounded-[10px] px-3 py-[9px] ${
        destaque ? 'bg-[#b33951] text-white' : 'bg-slate-100 text-slate-600'
      } ${aoClicar ? 'cursor-pointer hover:opacity-90' : ''}`}
    >
      <span className="flex-[0_0_78px] text-[11px] opacity-70">{horario}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[13px] font-semibold">{titulo}</span>
        {detalhe && <span className="truncate text-[11.5px] opacity-75">{detalhe}</span>}
      </div>
    </div>
  )
}

function VisaoDia({ data, eventosPorDia, aniversariantesDoDia, aoAbrirEvento }: PropriedadesVisaoDia) {
  const chave = chaveDeData(data)
  const eventosDoDia = eventosPorDia.get(chave) ?? []
  const eventos = eventosDoDia.filter((evento) => comecaNoDia(evento, chave))
  // Evento de vários dias: depois do primeiro dia, ocupa a faixa "Dia todo".
  const continuacoes = eventosDoDia.filter((evento) => !comecaNoDia(evento, chave))
  const aniversariantes = aniversariantesDoDia(data)
  const horas = faixaDeHoras(eventos)

  return (
    <div className="overflow-hidden rounded-[10px] border border-slate-200">
      {(aniversariantes.length > 0 || continuacoes.length > 0) && (
        <LinhaHorario rotulo="Dia todo">
          {continuacoes.map((evento) => (
            <ItemAgenda
              key={evento.id}
              horario="Continua"
              titulo={evento.titulo}
              detalhe={evento.conteudo ?? ''}
              destaque
              aoClicar={() => aoAbrirEvento(evento)}
            />
          ))}
          {aniversariantes.map((pessoa) => (
            <ItemAgenda
              key={pessoa.id}
              horario="Dia todo"
              titulo={`Aniversário · ${pessoa.nome}`}
              detalhe={pessoa.setorNome ?? ''}
              destaque={false}
            />
          ))}
        </LinhaHorario>
      )}
      {horas.map((hora) => (
        <LinhaHorario key={hora} rotulo={rotuloHora(hora)}>
          {eventos
            .filter((evento) => new Date(evento.dataInicio).getHours() === hora)
            .map((evento) => (
              <ItemAgenda
                key={evento.id}
                horario={formatarIntervaloHoras(evento)}
                titulo={evento.titulo}
                detalhe={evento.conteudo ?? ''}
                destaque
                aoClicar={() => aoAbrirEvento(evento)}
              />
            ))}
        </LinhaHorario>
      ))}
    </div>
  )
}

export default VisaoDia
