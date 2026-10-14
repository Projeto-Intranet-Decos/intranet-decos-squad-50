import { NOMES_MESES, formatarHora } from './formatadores'
import type { Evento, VisaoCalendario } from './types'

const MESES_ABREV = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
]

export const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

const NOMES_DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const HORA_INICIAL_PADRAO = 7
const HORA_FINAL_PADRAO = 19

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, '0')
}

export function chaveDia(ano: number, mes: number, dia: number): string {
  return `${ano}-${doisDigitos(mes + 1)}-${doisDigitos(dia)}`
}

export function chaveDeData(data: Date): string {
  return chaveDia(data.getFullYear(), data.getMonth(), data.getDate())
}

export function chaveDiaDeIso(iso: string): string {
  return chaveDeData(new Date(iso))
}

export function formatarIntervaloHoras(evento: Evento): string {
  const inicio = formatarHora(evento.dataInicio)
  return evento.dataFim ? `${inicio} – ${formatarHora(evento.dataFim)}` : inicio
}

export function rotuloHora(hora: number): string {
  return `${doisDigitos(hora)}:00`
}

export function separarDataHora(iso: string): { data: string; hora: string } {
  return { data: chaveDiaDeIso(iso), hora: formatarHora(iso) }
}

export function combinarDataHora(data: string, hora: string): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  const [horas, minutos] = (hora || '00:00').split(':').map(Number)
  return new Date(ano, mes - 1, dia, horas, minutos).toISOString()
}

export function somarDias(data: Date, dias: number): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias)
}

function somarMeses(data: Date, meses: number): Date {
  const alvo = new Date(data.getFullYear(), data.getMonth() + meses, 1)
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  return new Date(alvo.getFullYear(), alvo.getMonth(), Math.min(data.getDate(), ultimoDia))
}

export function deslocarPeriodo(data: Date, visao: VisaoCalendario, passo: number): Date {
  if (visao === 'dia') return somarDias(data, passo)
  if (visao === 'semana') return somarDias(data, passo * 7)
  if (visao === 'mes') return somarMeses(data, passo)
  return somarMeses(data, passo * 12)
}

export function diasDaSemana(data: Date): Date[] {
  const domingo = somarDias(data, -data.getDay())
  return Array.from({ length: 7 }, (_, indice) => somarDias(domingo, indice))
}

export function intervaloDoPeriodo(data: Date, visao: VisaoCalendario): { de: string; ate: string } {
  let inicio = data
  let fim = data
  if (visao === 'semana') {
    const dias = diasDaSemana(data)
    inicio = dias[0]
    fim = dias[6]
  } else if (visao === 'mes') {
    inicio = new Date(data.getFullYear(), data.getMonth(), 1)
    fim = new Date(data.getFullYear(), data.getMonth() + 1, 0)
  } else if (visao === 'ano') {
    inicio = new Date(data.getFullYear(), 0, 1)
    fim = new Date(data.getFullYear(), 11, 31)
  }
  return { de: chaveDeData(inicio), ate: chaveDeData(somarDias(fim, 1)) }
}

export function mesesDoPeriodo(data: Date, visao: VisaoCalendario): number[] {
  if (visao === 'ano') return Array.from({ length: 12 }, (_, indice) => indice + 1)
  if (visao === 'semana') return [...new Set(diasDaSemana(data).map((dia) => dia.getMonth() + 1))]
  return [data.getMonth() + 1]
}

export function tituloDoPeriodo(data: Date, visao: VisaoCalendario): string {
  const ano = data.getFullYear()
  if (visao === 'ano') return String(ano)
  if (visao === 'mes') return `${NOMES_MESES[data.getMonth()]} ${ano}`
  if (visao === 'dia') {
    const mes = NOMES_MESES[data.getMonth()].toLowerCase()
    return `${NOMES_DIAS_SEMANA[data.getDay()]}, ${data.getDate()} de ${mes} de ${ano}`
  }

  const dias = diasDaSemana(data)
  const inicio = dias[0]
  const fim = dias[6]
  const mesInicio = MESES_ABREV[inicio.getMonth()].toLowerCase()
  const mesFim = MESES_ABREV[fim.getMonth()].toLowerCase()
  if (inicio.getFullYear() !== fim.getFullYear()) {
    return `${inicio.getDate()} ${mesInicio} ${inicio.getFullYear()} – ${fim.getDate()} ${mesFim} ${fim.getFullYear()}`
  }
  if (inicio.getMonth() !== fim.getMonth()) {
    return `${inicio.getDate()} ${mesInicio} – ${fim.getDate()} ${mesFim} ${fim.getFullYear()}`
  }
  return `${inicio.getDate()}–${fim.getDate()} ${mesFim} ${fim.getFullYear()}`
}

export function faixaDeHoras(eventos: Evento[]): number[] {
  let inicial = HORA_INICIAL_PADRAO
  let final = HORA_FINAL_PADRAO
  for (const evento of eventos) {
    const hora = new Date(evento.dataInicio).getHours()
    inicial = Math.min(inicial, hora)
    final = Math.max(final, hora)
  }
  return Array.from({ length: final - inicial + 1 }, (_, indice) => inicial + indice)
}

/** Evento de vários dias entra em todos os dias que cobre (MUR-15). */
export function agruparEventosPorDia(eventos: Evento[]): Map<string, Evento[]> {
  const mapa = new Map<string, Evento[]>()
  for (const evento of eventos) {
    const inicio = new Date(evento.dataInicio)
    const ultimoDia = chaveDiaDeIso(evento.dataFim ?? evento.dataInicio)
    let dia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())
    for (let chave = chaveDeData(dia); chave <= ultimoDia; chave = chaveDeData(dia)) {
      mapa.set(chave, [...(mapa.get(chave) ?? []), evento])
      dia = somarDias(dia, 1)
    }
  }
  return mapa
}

/** Nas visões com horário, o evento só ocupa a hora de início no dia em que começa. */
export function comecaNoDia(evento: Evento, chave: string): boolean {
  return chaveDiaDeIso(evento.dataInicio) === chave
}

export interface CelulaMes {
  chave: string
  dia: number | null
  hoje: boolean
}

export function montarGradeMes(ano: number, mes: number): CelulaMes[] {
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay()
  const totalDias = new Date(ano, mes + 1, 0).getDate()
  const chaveHoje = chaveDeData(new Date())

  const celulas: CelulaMes[] = []
  for (let i = 0; i < primeiroDiaSemana; i++) {
    celulas.push({ chave: `vazio-inicio-${i}`, dia: null, hoje: false })
  }
  for (let dia = 1; dia <= totalDias; dia++) {
    const chave = chaveDia(ano, mes, dia)
    celulas.push({ chave, dia, hoje: chave === chaveHoje })
  }
  while (celulas.length % 7 !== 0) {
    celulas.push({ chave: `vazio-fim-${celulas.length}`, dia: null, hoje: false })
  }
  return celulas
}
