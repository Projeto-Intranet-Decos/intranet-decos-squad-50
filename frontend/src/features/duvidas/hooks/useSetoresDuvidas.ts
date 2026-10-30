import { useQuery } from '@tanstack/react-query'
import { listarSetores } from '../api'

export function useSetoresDuvidas() {
  return useQuery({
    queryKey: ['setores-duvidas'],
    queryFn: listarSetores,
  })
}
