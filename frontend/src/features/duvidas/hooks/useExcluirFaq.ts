import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { lerErroDaApi } from '../../../shared/erros'
import { excluirFaq } from '../api'

export function useExcluirFaq() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => excluirFaq(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq'] })
      toast.success('Pergunta excluída.')
    },
    onError: (erro) => toast.error(lerErroDaApi(erro, 'Erro ao excluir a pergunta. Tente novamente.').mensagem),
  })
}
