import { useQuery } from '@tanstack/react-query'
import { listarAtalhos } from '../api'

export function useAtalhos() {
  return useQuery({
    queryKey: ['atalhos'],
    queryFn: listarAtalhos,
  })
}
