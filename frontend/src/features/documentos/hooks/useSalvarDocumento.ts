import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { criarDocumento, editarDocumento, substituirArquivo } from '../api'
import type { EdicaoDocumento, ErroCampo, NovoDocumento } from '../types'

type VariaveisSalvarDocumento =
  | { id?: undefined; dados: NovoDocumento }
  | { id: string; dados: EdicaoDocumento; arquivo?: File | null }

export function useSalvarDocumento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variaveis: VariaveisSalvarDocumento) => {
      if (variaveis.id === undefined) return criarDocumento(variaveis.dados)
      const documento = await editarDocumento(variaveis.id, variaveis.dados)
      return variaveis.arquivo ? substituirArquivo(variaveis.id, variaveis.arquivo) : documento
    },
    onSuccess: (_documento, variaveis) => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
      toast.success(variaveis.id ? 'Documento atualizado com sucesso.' : 'Documento publicado com sucesso.')
    },
    onError: (erro) => {
      // O backend sempre devolve `mensagem`; `campo` só vem em erro de validação.
      if (isAxiosError<Partial<ErroCampo>>(erro) && erro.response?.data?.mensagem) {
        toast.error(erro.response.data.mensagem)
      } else if (isAxiosError(erro) && erro.response?.status === 413) {
        toast.error('O arquivo enviado passa do limite de tamanho.')
      } else {
        toast.error('Erro ao salvar o documento. Tente novamente.')
      }
    },
  })
}
