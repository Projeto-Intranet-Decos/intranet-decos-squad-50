import { useQuery } from '@tanstack/react-query'
import { listarSetores } from '../api'

export function useSetores() {
  return useQuery({
    queryKey: ['setores'],
    queryFn: listarSetores,
  })
}
