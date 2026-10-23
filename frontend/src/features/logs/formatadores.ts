const formatadorData = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const formatadorHora = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})

/** Ex: "03/09/2026 · 08:12" */
export function formatarDataHora(iso: string): string {
  const data = new Date(iso)
  return `${formatadorData.format(data)} · ${formatadorHora.format(data)}`
}
