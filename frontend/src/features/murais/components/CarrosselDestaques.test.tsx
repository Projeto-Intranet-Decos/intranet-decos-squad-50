import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import estilos from '../../../index.css?raw'
import CarrosselDestaques from './CarrosselDestaques'

describe('GER-14 — refração no carrossel', () => {
  it('a placa de texto usa o filtro SVG só com a classe refracao no iOS Glass', () => {
    const { container } = render(<CarrosselDestaques destaques={[]} aoAbrir={() => {}} />)

    expect(container.querySelector('filter#refracao-vidro feDisplacementMap')).not.toBeNull()
    expect(container.querySelector('.refracao-vidro')).not.toBeNull()
    // O jsdom não aplica o CSS: a regra é conferida no próprio index.css.
    const regra = estilos.match(/html\.refracao\[data-visual="ios"\][^{]*\.refracao-vidro \{[^}]*\}/)?.[0]
    expect(regra).toContain('url(#refracao-vidro)')
  })
})
