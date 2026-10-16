import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import type { ErroCampo } from '../../../shared/types'
import { excluirAtalho } from '../api'

export function useExcluirAtalho() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => excluirAtalho(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atalhos'] })
      toast.success('Atalho excluído.')
    },
    onError: (erro) => {
      const mensagem = isAxiosError<ErroCampo>(erro) ? erro.response?.data?.mensagem : undefined
      toast.error(mensagem ?? 'Erro ao excluir o atalho. Tente novamente.')
    },
  })
}
