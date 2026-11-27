import { useQuery } from '@tanstack/react-query'
import { buscarAviso } from '../api'

/** Um aviso pelo id, fora da lista (GER-28: o aviso aberto pelo sino). Sem id, nada é buscado. */
export function useAviso(id: string | null) {
  return useQuery({
    queryKey: ['avisos', id],
    queryFn: () => buscarAviso(id!),
    enabled: !!id,
    // Id que não existe mais é ignorado: não adianta tentar de novo.
    retry: false,
  })
}
