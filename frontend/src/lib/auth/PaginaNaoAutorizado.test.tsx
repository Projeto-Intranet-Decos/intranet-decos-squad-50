// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PaginaNaoAutorizado from './PaginaNaoAutorizado'

afterEach(() => cleanup())

describe('página de acesso não autorizado', () => {
  it('explica o bloqueio e oferece o caminho de volta ao mural', () => {
    render(
      <MemoryRouter>
        <PaginaNaoAutorizado />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Acesso não autorizado' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ir para o mural' }).getAttribute('href')).toBe('/mural')
  })
})
