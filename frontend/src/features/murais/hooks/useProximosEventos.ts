import { useMemo } from 'react'
import { chaveDeData } from '../formatadoresCalendario'
import { useEventos } from './useEventos'

const LIMITE_PROXIMOS_EVENTOS = 5

/** Os próximos eventos a partir de agora, para os painéis do mural e do calendário. */
export function useProximosEventos() {
  const { data: eventosFuturos = [] } = useEventos({ de: chaveDeData(new Date()) })
  return useMemo(() => {
    const agora = new Date()
    return eventosFuturos
      .filter((evento) => new Date(evento.dataInicio) >= agora)
      .slice(0, LIMITE_PROXIMOS_EVENTOS)
  }, [eventosFuturos])
}
