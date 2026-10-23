import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listarDocumentos } from '../api'
import type { FiltroDocumentos } from '../types'

export function useDocumentos(filtro: FiltroDocumentos) {
  return useQuery({
    queryKey: ['documentos', filtro],
    queryFn: () => listarDocumentos(filtro),
    placeholderData: keepPreviousData,
  })
}
