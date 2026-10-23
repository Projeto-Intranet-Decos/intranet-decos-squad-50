import { useQuery } from '@tanstack/react-query'
import { listarSetores } from '../api'

export function useSetoresDocumentos() {
  return useQuery({
    queryKey: ['setores-documentos'],
    queryFn: listarSetores,
  })
}
