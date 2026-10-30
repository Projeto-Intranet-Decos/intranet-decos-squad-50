import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { excluirDocumento } from '../api'
import type { ErroCampo } from '../types'

export function useExcluirDocumento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => excluirDocumento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
      toast.success('Documento excluído.')
    },
    onError: (erro) => {
      if (isAxiosError<Partial<ErroCampo>>(erro) && erro.response?.data?.mensagem) {
        toast.error(erro.response.data.mensagem)
      } else {
        toast.error('Erro ao excluir o documento. Tente novamente.')
      }
    },
  })
}
