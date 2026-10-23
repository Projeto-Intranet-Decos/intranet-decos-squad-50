import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { criarFaq, editarFaq } from '../api'
import type { EdicaoFaq, ErroCampo, NovaFaq } from '../types'

interface VariaveisSalvarFaq {
  id?: string
  dados: NovaFaq | EdicaoFaq
}

export function useSalvarFaq() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dados }: VariaveisSalvarFaq) => {
      if (id) return editarFaq(id, dados)
      return criarFaq(dados as NovaFaq)
    },
    onSuccess: (_faq, variaveis) => {
      queryClient.invalidateQueries({ queryKey: ['faq'] })
      toast.success(variaveis.id ? 'Pergunta atualizada com sucesso.' : 'Pergunta cadastrada com sucesso.')
    },
    onError: (erro) => {
      if (isAxiosError<ErroCampo>(erro) && erro.response?.data?.campo) {
        toast.error(erro.response.data.mensagem)
      } else {
        toast.error('Erro ao salvar a pergunta. Tente novamente.')
      }
    },
  })
}
