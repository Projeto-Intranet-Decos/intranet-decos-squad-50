import { motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import Botao from '../../shared/components/Botao'
import { useReduzirAnimacoes } from '../../shared/hooks/useReduzirAnimacoes'
import type { PassoIntroducao } from './passos'

interface PropriedadesIntroducao {
  passos: PassoIntroducao[]
  destacar: boolean
  aoEncerrar: () => void
}

const FOLGA_DESTAQUE = 6
const MARGEM = 16
const ALTURA_CARTAO = 260

function prenderFoco(e: KeyboardEvent, cartao: HTMLElement | null) {
  if (!cartao) return
  const botoes = [...cartao.querySelectorAll<HTMLElement>('button')]
  const primeiro = botoes[0]
  const ultimo = botoes[botoes.length - 1]
  const atual = document.activeElement
  if (e.shiftKey && (atual === primeiro || atual === cartao || !cartao.contains(atual))) {
    e.preventDefault()
    ultimo.focus()
  } else if (!e.shiftKey && (atual === ultimo || !cartao.contains(atual))) {
    e.preventDefault()
    primeiro.focus()
  }
}

function Introducao({ passos, destacar, aoEncerrar }: PropriedadesIntroducao) {
  const [indice, setIndice] = useState(0)
  const [retangulo, setRetangulo] = useState<DOMRect | null>(null)
  const cartaoRef = useRef<HTMLDivElement>(null)
  const aoEncerrarRef = useRef(aoEncerrar)
  const idTitulo = useId()
  const idTexto = useId()
  const semAnimacao = useReduzirAnimacoes()

  const indiceAtual = Math.min(indice, passos.length - 1)
  const passo = passos[indiceAtual]
  const isUltimo = indiceAtual === passos.length - 1
  const alvo = destacar ? passo.alvo : null

  useEffect(() => {
    aoEncerrarRef.current = aoEncerrar
  })

  useEffect(() => {
    const focoAnterior = document.activeElement as HTMLElement | null

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') aoEncerrarRef.current()
      if (e.key === 'Tab') prenderFoco(e, cartaoRef.current)
    }

    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      focoAnterior?.focus()
    }
  }, [])

  useEffect(() => {
    cartaoRef.current?.focus()
  }, [indiceAtual])

  useEffect(() => {
    const elemento = alvo ? document.querySelector<HTMLElement>(`[data-introducao="${alvo}"]`) : null
    elemento?.scrollIntoView?.({ block: 'nearest' })

    function medir() {
      setRetangulo(elemento ? elemento.getBoundingClientRect() : null)
    }

    const quadro = requestAnimationFrame(medir)
    window.addEventListener('resize', medir)
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('resize', medir)
    }
  }, [alvo])

  function avancar() {
    if (isUltimo) aoEncerrar()
    else setIndice(indiceAtual + 1)
  }

  const destaque = retangulo && {
    top: retangulo.top - FOLGA_DESTAQUE,
    left: retangulo.left - FOLGA_DESTAQUE,
    width: retangulo.width + FOLGA_DESTAQUE * 2,
    height: retangulo.height + FOLGA_DESTAQUE * 2,
  }
  const posicaoCartao = retangulo
    ? {
        top: Math.max(MARGEM, Math.min(retangulo.top, window.innerHeight - ALTURA_CARTAO)),
        left: retangulo.right + MARGEM,
      }
    : undefined

  return (
    <div className="fixed inset-0 z-[60]">
      {destaque ? (
        <motion.div
          data-testid="destaque-introducao"
          aria-hidden="true"
          initial={false}
          animate={destaque}
          transition={semAnimacao ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36 }}
          className="pointer-events-none fixed rounded-xl ring-2 ring-white/80 liquido:rounded-2xl"
          style={{ boxShadow: '0 0 0 9999px rgb(15 23 42 / 0.45)' }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-slate-900/45" />
      )}

      <div
        className={posicaoCartao ? 'fixed' : 'absolute inset-0 flex items-center justify-center p-4'}
        style={posicaoCartao}
      >
        <motion.div
          key={indiceAtual}
          ref={cartaoRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={idTitulo}
          aria-describedby={idTexto}
          tabIndex={-1}
          initial={semAnimacao ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="glass-modal relative w-[min(340px,calc(100vw-2rem))] rounded-2xl p-5 outline-none liquido:rounded-panel"
        >
          <span className="text-xs font-medium text-slate-500">{`${indiceAtual + 1} de ${passos.length}`}</span>
          <h2 id={idTitulo} className="m-0 mt-1 text-lg font-semibold tracking-tight text-slate-900 liquido:font-display liquido:text-xl">
            {passo.titulo}
          </h2>
          <p id={idTexto} className="m-0 mt-2 text-sm leading-relaxed text-slate-600">
            {passo.texto}
          </p>
          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={aoEncerrar}
              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
            >
              Pular
            </button>
            <div className="ml-auto flex gap-2">
              {indiceAtual > 0 && (
                <Botao variante="secundario" onClick={() => setIndice(indiceAtual - 1)}>
                  Anterior
                </Botao>
              )}
              <Botao variante="primario" onClick={avancar}>
                {isUltimo ? 'Concluir' : 'Próximo'}
              </Botao>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Introducao
