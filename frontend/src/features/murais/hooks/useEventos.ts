import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listarEventos } from '../api'
import type { FiltroEventos } from '../types'

// Debaixo de ['avisos']: salvar/excluir aviso já invalida os eventos.
export function useEventos(filtro: FiltroEventos = {}) {
  return useQuery({
    queryKey: ['avisos', 'eventos', filtro],
    queryFn: () => listarEventos(filtro),
    placeholderData: keepPreviousData,
  })
}
