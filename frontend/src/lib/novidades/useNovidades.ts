import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { listarDocumentos } from '../../features/documentos/api'
import type { Documento } from '../../features/documentos/types'
import { listarAvisos } from '../../features/murais/api'
import { ROTULO_CATEGORIA, type Aviso } from '../../features/murais/types'
import { buscarNovidadesVistas, marcarNovidadesVistas } from '../../features/usuarios/api'

export interface Novidade {
  chave: string
  tipo: 'aviso' | 'documento'
  titulo: string
  /** "Comunicado · Enfermagem", "Documento novo · Farmácia", "Nova versão (v3) · Farmácia". */
  detalhe: string
  /** ISO: publicação do aviso ou da versão atual do documento. */
  quando: string
  /** Página que abre o item (GER-28). */
  destino: string
}

const INTERVALO_MS = 5 * 60 * 1000

function deAviso(aviso: Aviso): Novidade {
  return {
    chave: `aviso:${aviso.id}`,
    tipo: 'aviso',
    titulo: aviso.titulo,
    detalhe: `${ROTULO_CATEGORIA[aviso.categoria]} · ${aviso.setorNome}`,
    quando: aviso.criadoEm,
    destino: `/mural?aviso=${aviso.id}`,
  }
}

function deDocumento(documento: Documento): Novidade {
  const versaoNova = documento.versao > 1
  return {
    chave: `documento:${documento.id}`,
    tipo: 'documento',
    titulo: documento.titulo,
    detalhe: `${versaoNova ? `Nova versão (v${documento.versao})` : 'Documento novo'} · ${documento.setorNome}`,
    // A substituição do arquivo atualiza `atualizadoEm`; numa versão nova é a melhor data que a lista traz.
    quando: versaoNova ? (documento.atualizadoEm ?? documento.criadoEm) : documento.criadoEm,
    destino: `/documentos?documento=${documento.id}`,
  }
}

/**
 * Avisos e documentos publicados por outras pessoas desde a última vez que o usuário abriu as
 * novidades (GER-28). A última visita fica no backend; sem usuário (visitante), nada é buscado.
 */
export function useNovidades(usuarioId: string | null) {
  const clienteDeConsultas = useQueryClient()
  const chaveVistas = ['novidades', 'vistas', usuarioId]

  const { data: desde } = useQuery({
    queryKey: chaveVistas,
    queryFn: buscarNovidadesVistas,
    enabled: !!usuarioId,
  })
  const avisos = useQuery({
    queryKey: ['novidades', 'avisos', desde],
    queryFn: () => listarAvisos(desde),
    enabled: !!desde,
    refetchInterval: INTERVALO_MS,
  })
  const documentos = useQuery({
    queryKey: ['novidades', 'documentos', desde],
    queryFn: () => listarDocumentos({ desde }),
    enabled: !!desde,
    refetchInterval: INTERVALO_MS,
  })

  const itens = useMemo(
    () =>
      [
        ...(avisos.data ?? []).filter((aviso) => aviso.autorId !== usuarioId).map(deAviso),
        ...(documentos.data ?? []).filter((documento) => documento.autorId !== usuarioId).map(deDocumento),
      ].sort((a, b) => Date.parse(b.quando) - Date.parse(a.quando)),
    [avisos.data, documentos.data, usuarioId],
  )

  const marcar = useMutation({
    mutationFn: marcarNovidadesVistas,
    // Com o `desde` novo as listas são buscadas de novo, já vazias.
    onSuccess: (vistasEm) => clienteDeConsultas.setQueryData(chaveVistas, vistasEm),
  })

  return { itens, marcarComoVistas: () => marcar.mutate() }
}
