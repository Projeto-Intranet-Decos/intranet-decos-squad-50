import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { lerErroDaApi } from '../../../shared/erros'
import { criarFaq, editarFaq } from '../api'
import type { EdicaoFaq, NovaFaq } from '../types'

type VariaveisSalvarFaq = { id?: undefined; dados: NovaFaq } | { id: string; dados: EdicaoFaq }

export function useSalvarFaq() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variaveis: VariaveisSalvarFaq) => {
      if (variaveis.id === undefined) return criarFaq(variaveis.dados)
      return editarFaq(variaveis.id, variaveis.dados)
    },
    onSuccess: (_faq, variaveis) => {
      queryClient.invalidateQueries({ queryKey: ['faq'] })
      toast.success(variaveis.id ? 'Pergunta atualizada com sucesso.' : 'Pergunta cadastrada com sucesso.')
    },
    onError: (erro) => toast.error(lerErroDaApi(erro, 'Erro ao salvar a pergunta. Tente novamente.').mensagem),
  })
}
