import { useState } from 'react'

export type DirecaoOrdenacao = 'asc' | 'desc'

// Ordenação pelo cabeçalho da tabela (GER-20): clicar na coluna ativa inverte a direção,
// clicar em outra coluna troca e volta pra crescente.
export function useOrdenacaoClique<Coluna extends string>(
  colunaInicial: Coluna,
  direcaoInicial: DirecaoOrdenacao = 'asc',
) {
  const [coluna, setColuna] = useState(colunaInicial)
  const [direcao, setDirecao] = useState<DirecaoOrdenacao>(direcaoInicial)

  function aoClicarColuna(novaColuna: Coluna) {
    if (novaColuna === coluna) {
      setDirecao((anterior) => (anterior === 'asc' ? 'desc' : 'asc'))
    } else {
      setColuna(novaColuna)
      setDirecao('asc')
    }
  }

  return { coluna, direcao, aoClicarColuna }
}
