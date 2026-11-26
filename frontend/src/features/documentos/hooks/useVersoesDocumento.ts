import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { baixarVersaoArquivo, listarVersoes } from '../api'
import type { VersaoDocumento } from '../types'

export function useVersoesDocumento(documentoId: string, versaoAtual: number) {
  return useQuery({
    // A versão atual na chave refaz a busca depois de uma substituição de arquivo.
    queryKey: ['documentos', documentoId, 'versoes', versaoAtual],
    queryFn: () => listarVersoes(documentoId),
  })
}

export function useBaixarVersao(documentoId: string) {
  return useMutation({
    mutationFn: async (versao: VersaoDocumento) => {
      const blob = await baixarVersaoArquivo(documentoId, versao.numero)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = versao.nomeArquivo
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
    onError: () => toast.error('Não foi possível obter essa versão. Tente novamente.'),
  })
}
