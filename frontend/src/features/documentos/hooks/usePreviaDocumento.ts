import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { baixarArquivo } from '../api'
import type { Documento } from '../types'

export type TipoPrevia = 'pdf' | 'imagem' | 'texto' | 'nenhum'

export function tipoPrevia(tipoConteudo: string): TipoPrevia {
  if (tipoConteudo === 'application/pdf') return 'pdf'
  if (tipoConteudo.startsWith('image/')) return 'imagem'
  if (tipoConteudo.startsWith('text/plain')) return 'texto'
  return 'nenhum'
}

// Só busca o arquivo quando o navegador consegue exibi-lo; Office e afins
// caem direto no aviso com opção de download.
export function usePreviaDocumento(documento: Documento) {
  const tipo = tipoPrevia(documento.tipoConteudo)

  const consulta = useQuery({
    queryKey: ['documentos', documento.id, 'previa', documento.atualizadoEm],
    queryFn: () => baixarArquivo(documento.id, true),
    enabled: tipo !== 'nenhum',
    gcTime: 0,
  })

  const url = useMemo(() => (consulta.data ? URL.createObjectURL(consulta.data) : null), [consulta.data])
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  return { tipo, url, isLoading: consulta.isLoading, isError: consulta.isError }
}
