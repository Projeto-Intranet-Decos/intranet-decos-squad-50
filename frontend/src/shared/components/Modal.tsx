import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconeX } from './icones'

interface PropriedadesModal {
  aberto: boolean
  titulo: string
  aoFechar: () => void
  largura?: string
  /** Substitui o título visível no topo. `titulo` continua sendo o nome
   * acessível do diálogo. */
  cabecalho?: ReactNode
  /** `amplo`: mais respiro e altura mínima, para leitura de conteúdo longo. */
  variante?: 'padrao' | 'amplo'
  children: ReactNode
}

const CLASSES_VARIANTE = {
  padrao: { fundo: 'p-4 sm:p-10', painel: '', conteudo: 'p-5 pb-5 sm:p-6', cabecalho: 'mb-5' },
  amplo: {
    fundo: 'p-4 sm:p-12',
    painel: 'min-h-[min(600px,100%)]',
    conteudo: 'p-5 pb-6 sm:p-10 sm:pb-8',
    cabecalho: 'mb-[22px]',
  },
}

const SELETOR_FOCAVEIS =
  'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

function Modal({
  aberto,
  titulo,
  aoFechar,
  largura = '560px',
  cabecalho,
  variante = 'padrao',
  children,
}: PropriedadesModal) {
  const idTitulo = useId()
  const painelRef = useRef<HTMLDivElement>(null)
  // Ref para o efeito não reinscrever o listener quando o pai recria `aoFechar`.
  const aoFecharRef = useRef(aoFechar)
  useEffect(() => {
    aoFecharRef.current = aoFechar
  })

  useEffect(() => {
    if (!aberto) return
    const focoAnterior = document.activeElement as HTMLElement | null
    painelRef.current?.focus()

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') aoFecharRef.current()
      if (e.key === 'Tab') prenderFoco(e)
    }

    // Tab no último volta ao primeiro, Shift+Tab no primeiro (ou no painel) vai ao último: o foco
    // não sai para a página atrás. No meio da lista o navegador segue sozinho.
    function prenderFoco(e: KeyboardEvent) {
      const painel = painelRef.current
      if (!painel) return
      // Os inputs de arquivo dos formulários ficam ocultos (display: none) e não recebem foco.
      const focaveis = [...painel.querySelectorAll<HTMLElement>(SELETOR_FOCAVEIS)].filter(
        (el) => !el.closest('[inert]') && (typeof el.checkVisibility !== 'function' || el.checkVisibility()),
      )
      if (focaveis.length === 0) {
        e.preventDefault()
        return
      }
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      const atual = document.activeElement
      if (e.shiftKey && (atual === primeiro || atual === painel || !painel.contains(atual))) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (atual === ultimo || !painel.contains(atual))) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      focoAnterior?.focus()
    }
  }, [aberto])

  if (!aberto) return null

  const classes = CLASSES_VARIANTE[variante]

  return (
    <div onClick={aoFechar} className={`fixed inset-0 z-50 flex items-center justify-center ${classes.fundo}`}>
      {/* O fundo é irmão do painel, não pai: um backdrop-filter dentro de outro só enxerga o
          conteúdo do pai, e o painel deixaria de desfocar a página. */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[3px] ios:bg-slate-900/25 ios:backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={cabecalho ? undefined : idTitulo}
        aria-label={cabecalho ? titulo : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ width: largura }}
        className={`glass-modal relative flex max-h-full w-full max-w-full flex-col overflow-hidden rounded-2xl outline-none ios:rounded-panel ${classes.painel}`}
      >
        {/* A rolagem fica num filho para o brilho da borda (::before do vidro) não rolar junto. */}
        <div className={`flex min-h-0 flex-1 flex-col overflow-auto ${classes.conteudo}`}>
          <div className={`flex items-center gap-4 ${classes.cabecalho}`}>
            {cabecalho ?? (
              <h2 id={idTitulo} className="m-0 text-lg font-semibold tracking-tight text-slate-900 ios:font-display ios:text-xl">
                {titulo}
              </h2>
            )}
            <button
              type="button"
              onClick={aoFechar}
              className="-mr-2 ml-auto flex size-10 flex-none items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-800 sm:size-8 ios:mr-0 ios:btn-icon"
              title="Fechar"
              aria-label="Fechar"
            >
              <IconeX tamanho={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
