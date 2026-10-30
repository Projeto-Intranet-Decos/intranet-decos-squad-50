const MESES_ABREV = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
]

export const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/** "2026-08-28T08:40:00" -> "28 AGO" */
export function formatarDiaMes(iso: string): string {
  const data = new Date(iso)
  return `${String(data.getDate()).padStart(2, '0')} ${MESES_ABREV[data.getMonth()]}`
}

/** "2026-08-28T08:40:00" -> "08:40" */
export function formatarHora(iso: string): string {
  const data = new Date(iso)
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`
}

/**
 * Quando acontece um evento, em uma linha:
 * "15 OUT · 14:00 às 16:00" no mesmo dia, "30 SET 08:00 até 02 OUT 18:00" em vários dias.
 */
export function formatarPeriodoEvento(dataInicio: string, dataFim: string | null): string {
  const inicio = `${formatarDiaMes(dataInicio)} · ${formatarHora(dataInicio)}`
  if (!dataFim) return inicio
  if (formatarDiaMes(dataFim) === formatarDiaMes(dataInicio)) {
    return `${inicio} às ${formatarHora(dataFim)}`
  }
  return `${formatarDiaMes(dataInicio)} ${formatarHora(dataInicio)} até ${formatarDiaMes(dataFim)} ${formatarHora(dataFim)}`
}

export function formatarTamanhoArquivo(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
