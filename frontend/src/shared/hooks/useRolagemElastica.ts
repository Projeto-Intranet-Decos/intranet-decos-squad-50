import { useEffect, type RefObject } from 'react'

// Efeito elástico (rubber banding) na rolagem da página — GER-15.

export const DESLOCAMENTO_MAXIMO = 96
const RESISTENCIA = 0.55
const PAUSA_PARA_SOLTAR_MS = 90
const TRANSICAO_ACOMPANHAR = 'transform 120ms cubic-bezier(0, 0, 0.2, 1)'
const TRANSICAO_VOLTAR = 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)'
// Abaixo disso é o rabo da inércia do trackpad: não segura o conteúdo deslocado.
const DELTA_MINIMO = 3

/** Quanto o conteúdo se desloca para uma rolagem acumulada além do limite da página. */
export function deslocamentoElastico(acumulado: number): number {
  const distancia = Math.abs(acumulado)
  const deslocamento = (1 - 1 / ((distancia * RESISTENCIA) / DESLOCAMENTO_MAXIMO + 1)) * DESLOCAMENTO_MAXIMO
  return Math.sign(acumulado) * deslocamento
}

function emPixels(evento: WheelEvent) {
  if (evento.deltaMode === WheelEvent.DOM_DELTA_LINE) return evento.deltaY * 32
  if (evento.deltaMode === WheelEvent.DOM_DELTA_PAGE) return evento.deltaY * window.innerHeight
  return evento.deltaY
}

function temRolagemPropria(alvo: EventTarget | null) {
  for (let no = alvo instanceof Element ? alvo : null; no && no !== document.documentElement; no = no.parentElement) {
    if (no === document.body || no.scrollHeight <= no.clientHeight) continue
    const { overflowY } = getComputedStyle(no)
    if (overflowY === 'auto' || overflowY === 'scroll') return true
  }
  return false
}

/**
 * Desloca `alvoRef` com resistência quando a rolagem da página passa do topo ou do fim, e o
 * devolve ao lugar quando ela para. O `transform` só existe durante o efeito: fora dele o
 * elemento não vira containing block dos modais (`position: fixed`) que estão dentro.
 */
export function useRolagemElastica(alvoRef: RefObject<HTMLElement | null>, ativo: boolean) {
  useEffect(() => {
    const alvo = alvoRef.current
    if (!ativo || !alvo) return

    const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)')
    let acumulado = 0
    let temporizador: number | undefined

    function soltar(transicao = TRANSICAO_VOLTAR) {
      window.clearTimeout(temporizador)
      if (acumulado === 0) return
      acumulado = 0
      alvo!.style.transition = transicao
      alvo!.style.transform = ''
    }

    // Clique ou tecla pode abrir um modal: o conteúdo volta já, sem animar.
    function soltarNaHora() {
      soltar('none')
    }

    function aoRolar(evento: WheelEvent) {
      const delta = emPixels(evento)
      if (evento.ctrlKey || delta === 0 || Math.abs(evento.deltaX) > Math.abs(evento.deltaY)) return
      if (menosMovimento.matches || document.querySelector('[aria-modal="true"]') || temRolagemPropria(evento.target)) {
        return
      }

      const noTopo = window.scrollY <= 0
      const noFim = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1
      const alemDoLimite = delta < 0 ? noTopo : noFim
      const mudouDeSentido = acumulado !== 0 && Math.sign(acumulado) === Math.sign(delta)
      if (!alemDoLimite || mudouDeSentido) {
        soltar()
        return
      }
      if (Math.abs(delta) < DELTA_MINIMO) return

      // Rolar para cima (delta negativo) no topo empurra o conteúdo para baixo.
      acumulado -= delta
      alvo!.style.transition = TRANSICAO_ACOMPANHAR
      alvo!.style.transform = `translateY(${deslocamentoElastico(acumulado).toFixed(1)}px)`
      window.clearTimeout(temporizador)
      temporizador = window.setTimeout(soltar, PAUSA_PARA_SOLTAR_MS)
    }

    window.addEventListener('wheel', aoRolar, { passive: true })
    window.addEventListener('pointerdown', soltarNaHora, true)
    window.addEventListener('keydown', soltarNaHora, true)
    return () => {
      window.removeEventListener('wheel', aoRolar)
      window.removeEventListener('pointerdown', soltarNaHora, true)
      window.removeEventListener('keydown', soltarNaHora, true)
      soltarNaHora()
    }
  }, [alvoRef, ativo])
}
