import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { excluirFaq } from '../api'

export function useExcluirFaq() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => excluirFaq(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq'] })
      toast.success('Pergunta excluída.')
    },
    onError: () => toast.error('Erro ao excluir a pergunta. Tente novamente.'),
  })
}
