import type { ElementType, ReactNode } from 'react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { IconeCaretDown } from './icones'

interface PropriedadesSecaoMenu {
  titulo: string
  compacto: boolean
  semAnimacao: boolean
  as?: ElementType
  className?: string
  acoes?: ReactNode
  children: ReactNode
}

// Seção colapsável do menu lateral (GER-19): cabeçalho com seta que abre/fecha os itens.
// Sem cabeçalho nem colapso quando o menu está recolhido para ícones — mostra tudo sempre.
function SecaoMenu({
  titulo,
  compacto,
  semAnimacao,
  as: Tag = 'div',
  className = '',
  acoes,
  children,
}: PropriedadesSecaoMenu) {
  const [expandido, setExpandido] = useState(true)

  if (compacto) {
    return <Tag className={`flex flex-none flex-col gap-1 ${className}`}>{children}</Tag>
  }

  return (
    <Tag className={`flex flex-none flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between pr-1.5 pb-2 pl-3 liquido:pl-3.5">
        <button
          type="button"
          onClick={() => setExpandido((anterior) => !anterior)}
          aria-expanded={expandido}
          className="flex flex-1 items-center gap-1 text-left"
        >
          <span className="text-[10px] tracking-[0.12em] text-slate-500 uppercase liquido:text-xs liquido:font-semibold liquido:tracking-normal liquido:normal-case">
            {titulo}
          </span>
          <motion.span
            animate={{ rotate: expandido ? 0 : -90 }}
            transition={semAnimacao ? { duration: 0 } : { duration: 0.18 }}
            className="flex-none text-slate-400"
          >
            <IconeCaretDown tamanho={13} />
          </motion.span>
        </button>
        {acoes}
      </div>
      <AnimatePresence initial={false}>
        {expandido && (
          <motion.div
            key="itens"
            initial={semAnimacao ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={semAnimacao ? undefined : { height: 0, opacity: 0 }}
            transition={semAnimacao ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="flex flex-col gap-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Tag>
  )
}

export default SecaoMenu
