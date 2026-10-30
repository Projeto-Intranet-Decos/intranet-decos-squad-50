import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import {
  criarAviso,
  editarAviso,
  enviarAnexosAviso,
  removerAnexoAviso,
  removerImagemAviso,
  substituirImagemAviso,
} from '../api'
import type { EdicaoAviso, ErroCampo, NovoAviso } from '../types'

/** O que mudou nos arquivos durante a edição. */
export interface AlteracoesArquivosAviso {
  /** `undefined` mantém a capa atual, `null` remove, `File` troca. */
  imagem?: File | null
  anexosNovos: File[]
  anexosRemovidos: string[]
}

type VariaveisSalvarAviso =
  | { id?: undefined; dados: NovoAviso }
  | { id: string; dados: EdicaoAviso; arquivos: AlteracoesArquivosAviso }

async function salvarEdicao(id: string, dados: EdicaoAviso, arquivos: AlteracoesArquivosAviso) {
  await editarAviso(id, dados)
  if (arquivos.imagem) await substituirImagemAviso(id, arquivos.imagem)
  else if (arquivos.imagem === null) await removerImagemAviso(id)
  // Remove antes de enviar, para não esbarrar no limite de anexos do backend.
  for (const anexoId of arquivos.anexosRemovidos) await removerAnexoAviso(id, anexoId)
  if (arquivos.anexosNovos.length > 0) await enviarAnexosAviso(id, arquivos.anexosNovos)
}

export function useSalvarAviso() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variaveis: VariaveisSalvarAviso) => {
      if (variaveis.id === undefined) {
        await criarAviso(variaveis.dados)
        return
      }
      await salvarEdicao(variaveis.id, variaveis.dados, variaveis.arquivos)
    },
    onSuccess: (_resultado, variaveis) => {
      toast.success(variaveis.id ? 'Aviso atualizado com sucesso.' : 'Aviso publicado com sucesso.')
    },
    onError: (erro) => {
      // O backend sempre devolve `mensagem`; `campo` só vem em erro de validação.
      if (isAxiosError<Partial<ErroCampo>>(erro) && erro.response?.data?.mensagem) {
        toast.error(erro.response.data.mensagem)
      } else if (isAxiosError(erro) && erro.response?.status === 413) {
        toast.error('Os arquivos enviados passam do limite de tamanho.')
      } else {
        toast.error('Erro ao salvar o aviso. Tente novamente.')
      }
    },
    // Na edição, parte das etapas pode ter dado certo antes do erro: recarrega sempre.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos'] })
    },
  })
}
