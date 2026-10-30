import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { excluirAviso } from '../api'
import type { ErroCampo } from '../types'

export function useExcluirAviso() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => excluirAviso(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos'] })
      toast.success('Aviso excluído.')
    },
    onError: (erro) => {
      if (isAxiosError<Partial<ErroCampo>>(erro) && erro.response?.data?.mensagem) {
        toast.error(erro.response.data.mensagem)
      } else {
        toast.error('Erro ao excluir o aviso. Tente novamente.')
      }
    },
  })
}
