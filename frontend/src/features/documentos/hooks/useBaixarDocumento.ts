import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { baixarArquivo } from '../api'
import type { Documento } from '../types'

interface VariaveisBaixar {
  documento: Documento
}

export function useBaixarDocumento() {
  return useMutation({
    mutationFn: async ({ documento }: VariaveisBaixar) => {
      const blob = await baixarArquivo(documento.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = documento.nomeArquivo
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
    onError: () => toast.error('Não foi possível obter o arquivo. Tente novamente.'),
  })
}
