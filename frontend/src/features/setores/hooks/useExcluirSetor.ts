import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import type { ErroCampo } from '../../../shared/types'
import { excluirSetor } from '../api'

export function useExcluirSetor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => excluirSetor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] })
      toast.success('Setor excluído.')
    },
    onError: (erro) => {
      const mensagem = isAxiosError<ErroCampo>(erro) ? erro.response?.data?.mensagem : undefined
      toast.error(mensagem ?? 'Erro ao excluir o setor. Tente novamente.')
    },
  })
}
