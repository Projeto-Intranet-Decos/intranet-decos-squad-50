import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import estilos from '../../../index.css?raw'
import BarraFiltrosMural from './BarraFiltrosMural'

describe('MUR-11 — barra de busca e filtros do mural', () => {
  it('fica presa ao topo no iOS Glass a partir de 1024px', () => {
    const { container } = render(
      <BarraFiltrosMural
        busca=""
        aoMudarBusca={() => {}}
        categoria=""
        aoMudarCategoria={() => {}}
        setorId=""
        aoMudarSetor={() => {}}
        setores={[]}
        podeCriar={false}
        aoNovoAviso={() => {}}
      />,
    )

    expect((container.firstElementChild as HTMLElement).className).toContain('barra-filtros-fixa')
    // O jsdom não aplica o CSS: a regra é conferida no próprio index.css.
    const regra = estilos.match(/@media \(width >= 64rem\) \{\s*\[data-visual="ios"\] \.barra-filtros-fixa \{[^}]*\}/)?.[0]
    expect(regra).toContain('position: sticky')
  })
})
