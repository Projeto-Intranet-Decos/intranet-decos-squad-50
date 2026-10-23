import { useQuery } from '@tanstack/react-query'
import { listarAvisos } from '../api'

export function useAvisos() {
  return useQuery({
    queryKey: ['avisos'],
    queryFn: listarAvisos,
  })
}
