import type { Documento } from './types'

export interface VersaoDocumento {
  numero: number
  data: string
  autorNome: string
  alteracao: string
  nomeArquivo: string
  tamanhoBytes: number
}

const ALTERACOES_FICTICIAS = [
  'Revisão anual, sem mudança de conteúdo.',
  'Atualização do passo a passo conforme nova orientação da CCIH.',
  'Inclusão de checklist de conferência no final.',
  'Correção dos responsáveis e ramais de contato.',
]

const AUTORES_FICTICIOS = ['Núcleo de Qualidade', 'Coordenação de Enfermagem', 'Comissão de Controle de Infecção']

const DIA_EM_MS = 24 * 60 * 60 * 1000
const INTERVALO_ENTRE_VERSOES_DIAS = 120

function semente(texto: string): number {
  return [...texto].reduce((soma, letra) => soma + letra.charCodeAt(0), 0)
}

export function gerarVersoesFicticias(documento: Documento): VersaoDocumento[] {
  const base = semente(documento.id)
  const total = (base % 4) + 1
  const dataAtual = new Date(documento.atualizadoEm ?? documento.criadoEm).getTime()

  return Array.from({ length: total }, (_, indice) => {
    const numero = total - indice
    const isAtual = indice === 0
    return {
      numero,
      data: new Date(dataAtual - indice * INTERVALO_ENTRE_VERSOES_DIAS * DIA_EM_MS).toISOString(),
      autorNome: isAtual ? documento.autorNome : AUTORES_FICTICIOS[(base + indice) % AUTORES_FICTICIOS.length],
      alteracao: numero === 1 ? 'Versão inicial.' : ALTERACOES_FICTICIAS[(base + indice) % ALTERACOES_FICTICIAS.length],
      nomeArquivo: documento.nomeArquivo,
      tamanhoBytes: Math.max(1024, documento.tamanhoBytes - indice * 4096),
    }
  })
}
