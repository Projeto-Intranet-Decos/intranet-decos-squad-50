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
  /** ISO: publicação do aviso ou envio da versão atual do documento. */
  quando: string
  /** Página que abre o item (GER-28). */
  destino: string
}

/** O que o sino mostra ao abrir e até onde marcar como visto. */
export interface NovidadesBuscadas {
  itens: Novidade[]
  /** Instante mais recente da busca; `null` quando não veio nada ou a busca falhou. */
  ate: string | null
}

const INTERVALO_MS = 5 * 60 * 1000

/** Compara ISO do backend sem perder os microssegundos que o `Date` descarta. */
function compararInstantes(a: string, b: string): number {
  const diferenca = Date.parse(a) - Date.parse(b)
  return diferenca !== 0 ? diferenca : microssegundos(a) - microssegundos(b)
}

function microssegundos(iso: string): number {
  const fracao = /\.(\d+)/.exec(iso)?.[1] ?? ''
  return Number(fracao.slice(3, 6).padEnd(3, '0'))
}

function maisRecente(instantes: string[]): string | null {
  return instantes.reduce<string | null>(
    (maior, instante) => (maior === null || compararInstantes(instante, maior) > 0 ? instante : maior),
    null,
  )
}

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
    quando: documento.versaoCriadaEm,
    destino: `/documentos?documento=${documento.id}`,
  }
}

function montarItens(avisos: Aviso[] = [], documentos: Documento[] = [], usuarioId: string | null): Novidade[] {
  return [
    ...avisos.filter((aviso) => aviso.autorId !== usuarioId).map(deAviso),
    // Num documento, conta quem enviou a versão atual, não quem criou o documento.
    ...documentos.filter((documento) => documento.versaoAutorId !== usuarioId).map(deDocumento),
  ].sort((a, b) => compararInstantes(b.quando, a.quando))
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
    () => montarItens(avisos.data, documentos.data, usuarioId),
    [avisos.data, documentos.data, usuarioId],
  )

  const marcar = useMutation({
    mutationFn: (ate: string) => marcarNovidadesVistas(ate),
    // Com o `desde` novo as listas são buscadas de novo, sem o que já foi visto.
    onSuccess: (vistasEm) => clienteDeConsultas.setQueryData(chaveVistas, vistasEm),
  })

  /**
   * Busca as listas de novo para o modal: a contagem do sino pode ter até 5 minutos, e marcar
   * como visto o que o modal não mostrou faria o item sumir sem nunca aparecer. `ate` conta
   * também o que o próprio usuário publicou: tudo até ali veio nesta busca.
   */
  async function buscarParaAbrir(): Promise<NovidadesBuscadas> {
    if (!desde) return { itens: [], ate: null }
    const [novosAvisos, novosDocumentos] = await Promise.all([avisos.refetch(), documentos.refetch()])
    const lista = montarItens(novosAvisos.data, novosDocumentos.data, usuarioId)
    if (novosAvisos.isError || novosDocumentos.isError) return { itens: lista, ate: null }
    const ate = maisRecente([
      ...(novosAvisos.data ?? []).map((aviso) => aviso.criadoEm),
      ...(novosDocumentos.data ?? []).map((documento) => documento.versaoCriadaEm),
    ])
    return { itens: lista, ate }
  }

  return {
    itens,
    /** Sem a última visita não há o que buscar: o sino fica desabilitado. */
    pronto: !!desde,
    buscarParaAbrir,
    marcarComoVistas: (ate: string) => marcar.mutate(ate),
  }
}
