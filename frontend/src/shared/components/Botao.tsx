import { forwardRef, type ButtonHTMLAttributes } from 'react'

type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'icone'

interface PropriedadesBotao extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao
}

const ESTILOS: Record<VarianteBotao, string> = {
  primario: 'btn btn-primary',
  secundario: 'btn btn-secondary',
  perigo: 'btn btn-danger',
  icone:
    'flex size-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700 sm:size-8 ios:btn-icon',
}

const Botao = forwardRef<HTMLButtonElement, PropriedadesBotao>(function Botao(
  { variante = 'secundario', className, ...resto },
  ref,
) {
  return <button ref={ref} type="button" className={`${ESTILOS[variante]} ${className ?? ''}`} {...resto} />
})

export default Botao
