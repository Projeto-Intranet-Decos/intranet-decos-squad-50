import { ROTULO_CATEGORIA, type CategoriaAviso } from '../types'

const CORES: Record<CategoriaAviso, string> = {
  comunicado: 'bg-blue-600',
  promocao: 'bg-red-600',
  evento: 'bg-emerald-700',
}

interface PropriedadesBadgeCategoria {
  categoria: CategoriaAviso
  /** Quando o aviso tem imagem, o design usa a cor da marca em vez da cor
   * por categoria (destaca melhor sobre a foto de capa). */
  comImagem?: boolean
  className?: string
}

function BadgeCategoria({ categoria, comImagem, className }: PropriedadesBadgeCategoria) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] tracking-wide text-white ${
        comImagem ? 'bg-[#800020]' : CORES[categoria]
      } ${className ?? ''}`}
    >
      {ROTULO_CATEGORIA[categoria].toUpperCase()}
    </span>
  )
}

export default BadgeCategoria
