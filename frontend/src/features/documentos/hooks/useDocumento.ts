import { useQuery } from '@tanstack/react-query'
import { buscarDocumento } from '../api'

/**
 * Um documento pelo id, fora da lista e dos filtros da página (GER-28: o documento aberto pelo
 * sino). Sem id, nada é buscado.
 */
export function useDocumento(id: string | null) {
  return useQuery({
    queryKey: ['documentos', id],
    queryFn: () => buscarDocumento(id!),
    enabled: !!id,
    // Id que não existe mais é ignorado: não adianta tentar de novo.
    retry: false,
  })
}
