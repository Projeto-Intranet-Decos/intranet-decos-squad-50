import { ROTULO_CATEGORIA, type CategoriaAviso } from '../types'

// Categoria é tag, não status: tons claros com texto escuro, e nunca o
// vermelho de erro (promoção usa o bordô da marca).
const CORES: Record<CategoriaAviso, string> = {
  comunicado: 'bg-blue-50 text-blue-700 ring-blue-200',
  promocao: 'bg-brand-50 text-brand-700 ring-brand-100',
  evento: 'bg-green-50 text-green-700 ring-green-200',
}

interface PropriedadesBadgeCategoria {
  categoria: CategoriaAviso
  /** Quando o aviso tem imagem, o design usa a cor da marca em vez da cor
   * por categoria (destaca melhor sobre a foto de capa). */
  comImagem?: boolean
  /** Badge sobre a foto escura do carrossel. */
  sobreFoto?: boolean
  className?: string
}

function BadgeCategoria({ categoria, comImagem, sobreFoto, className }: PropriedadesBadgeCategoria) {
  const cores = sobreFoto
    ? 'bg-white/15 text-white ring-white/30 ios:ring-white/25'
    : comImagem
      ? 'bg-brand-600 text-white ring-brand-600'
      : CORES[categoria]

  return (
    // A caixa alta é do Vidro clínico; no iOS Glass o selo é uma cápsula em frase normal.
    <span
      className={`rounded-full px-2.5 py-1 text-[10.5px] font-medium tracking-wide uppercase ring-1 ios:pill ${cores} ${className ?? ''}`}
    >
      {ROTULO_CATEGORIA[categoria]}
    </span>
  )
}

export default BadgeCategoria
