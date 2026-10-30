import { useQuery } from '@tanstack/react-query'
import { listarAtividades } from '../api'

export function useAtividades() {
  return useQuery({
    queryKey: ['atividades'],
    queryFn: listarAtividades,
  })
}
