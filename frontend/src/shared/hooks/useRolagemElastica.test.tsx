import { act, render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { simularConsultasDeMidia } from '../../testes/apoio'
import { DESLOCAMENTO_MAXIMO, deslocamentoElastico, useRolagemElastica } from './useRolagemElastica'

function Conteudo({ ativo = true }: { ativo?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useRolagemElastica(ref, ativo)
  return (
    <div ref={ref} data-testid="conteudo">
      <p>texto</p>
    </div>
  )
}

function montar(ativo = true) {
  const { getByTestId } = render(<Conteudo ativo={ativo} />)
  return getByTestId('conteudo')
}

function rolar(deltaY: number, opcoes: WheelEventInit = {}, alvo: EventTarget = document.body) {
  act(() => {
    alvo.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, ...opcoes }))
  })
}

function deslocamento(elemento: HTMLElement) {
  const achado = /translateY\((-?[\d.]+)px\)/.exec(elemento.style.transform)
  return achado ? Number(achado[1]) : 0
}

// No jsdom a página não tem altura: está ao mesmo tempo no topo e no fim.
describe('GER-15 — efeito elástico na rolagem', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('a resistência cresce: cada rolagem desloca menos e nunca passa de 96px', () => {
    const passos = [100, 200, 400, 800, 100000].map(deslocamentoElastico)

    expect(passos[0]).toBeGreaterThan(0)
    for (let i = 1; i < passos.length; i++) {
      expect(passos[i]).toBeGreaterThan(passos[i - 1])
      expect(passos[i]).toBeLessThan(DESLOCAMENTO_MAXIMO)
    }
    expect(passos[1] - passos[0]).toBeLessThan(passos[0])
    expect(deslocamentoElastico(-100)).toBe(-passos[0])
  })

  it('rolar para cima no topo desce o conteúdo; no fim, rolar para baixo sobe', () => {
    const conteudo = montar()

    rolar(-100)
    const primeiro = deslocamento(conteudo)
    rolar(-100)

    expect(primeiro).toBeGreaterThan(0)
    expect(deslocamento(conteudo)).toBeGreaterThan(primeiro)
    expect(deslocamento(conteudo)).toBeLessThan(DESLOCAMENTO_MAXIMO)

    act(() => vi.runAllTimers())
    rolar(100)
    expect(deslocamento(conteudo)).toBeLessThan(0)
  })

  it('volta à posição original quando a rolagem para', () => {
    const conteudo = montar()
    rolar(-100)

    act(() => vi.advanceTimersByTime(200))

    expect(conteudo.style.transform).toBe('')
  })

  it('volta à posição original quando a rolagem muda de sentido', () => {
    const conteudo = montar()
    rolar(-100)

    rolar(100)

    expect(conteudo.style.transform).toBe('')
  })

  it('não desloca fora dos limites da página', () => {
    const conteudo = montar()
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(300)
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000)

    rolar(-100)
    rolar(100)

    expect(conteudo.style.transform).toBe('')
    vi.restoreAllMocks()
  })

  it('não acontece com um modal aberto', () => {
    const conteudo = montar()
    const modal = document.createElement('div')
    modal.setAttribute('aria-modal', 'true')
    document.body.append(modal)

    rolar(-100)

    expect(conteudo.style.transform).toBe('')
    modal.remove()
  })

  it('não acontece sobre uma área com rolagem própria', () => {
    const conteudo = montar()
    const lista = document.createElement('div')
    lista.style.overflowY = 'auto'
    Object.defineProperty(lista, 'scrollHeight', { value: 900 })
    Object.defineProperty(lista, 'clientHeight', { value: 300 })
    conteudo.append(lista)

    rolar(-100, {}, lista)

    expect(conteudo.style.transform).toBe('')
  })

  it('não acontece com Ctrl pressionado (zoom)', () => {
    const conteudo = montar()

    rolar(-100, { ctrlKey: true })

    expect(conteudo.style.transform).toBe('')
  })

  it('não acontece quando está desligado', () => {
    const conteudo = montar(false)

    rolar(-100)

    expect(conteudo.style.transform).toBe('')
  })

  it('não acontece com prefers-reduced-motion', () => {
    simularConsultasDeMidia((consulta) => consulta.includes('prefers-reduced-motion'))
    const conteudo = montar()

    rolar(-100)

    expect(conteudo.style.transform).toBe('')
  })
})
