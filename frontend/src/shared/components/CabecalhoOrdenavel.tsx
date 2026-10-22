import type { DirecaoOrdenacao } from '../hooks/useOrdenacaoClique'
import { IconeCaretDown, IconeCaretUp } from './icones'

interface PropriedadesCabecalhoOrdenavel {
  rotulo: string
  ativo: boolean
  direcao: DirecaoOrdenacao
  aoClicar: () => void
  className?: string
}

// Cabeçalho de coluna ordenável (GER-20): nome da coluna + seta, dentro de um `<th>`
// real ou de uma célula em grid, conforme a tabela que usa.
function CabecalhoOrdenavel({ rotulo, ativo, direcao, aoClicar, className = '' }: PropriedadesCabecalhoOrdenavel) {
  const Icone = direcao === 'desc' ? IconeCaretDown : IconeCaretUp

  return (
    <button
      type="button"
      onClick={aoClicar}
      className={`inline-flex items-center gap-1 text-left transition-colors hover:text-slate-700 liquido:hover:text-slate-800 ${className}`}
    >
      {rotulo}
      <Icone tamanho={12} className={`flex-none ${ativo ? 'text-slate-600' : 'text-slate-400/60'}`} />
    </button>
  )
}

export default CabecalhoOrdenavel
