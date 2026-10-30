import { useQuery } from '@tanstack/react-query'
import { listarFaq } from '../api'

export function useFaq() {
  return useQuery({
    queryKey: ['faq'],
    queryFn: listarFaq,
  })
}
