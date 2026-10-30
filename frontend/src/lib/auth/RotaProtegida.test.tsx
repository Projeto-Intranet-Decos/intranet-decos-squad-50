// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RotaProtegida from './RotaProtegida'
import { entrarComToken } from './useAuth'

function tokenDe(role: string): string {
  const carga = btoa(JSON.stringify({ sub: 'u1', role, setor_id: null }))
  return `x.${carga}.y`
}

function montar() {
  render(
    <MemoryRouter initialEntries={['/usuarios']}>
      <Routes>
        <Route path="/login" element={<div>tela de login</div>} />
        <Route path="/nao-autorizado" element={<div>nao autorizado</div>} />
        <Route
          path="/usuarios"
          element={
            <RotaProtegida papeisPermitidos={['superadmin']}>
              <div>administração</div>
            </RotaProtegida>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('AUT-10 — administração segue protegida no modo visitante', () => {
  it('visitante em /usuarios vai para o login', () => {
    montar()

    expect(screen.getByText('tela de login')).toBeTruthy()
  })

  it('comum em /usuarios vai para não autorizado', () => {
    entrarComToken(tokenDe('comum'))
    montar()

    expect(screen.getByText('nao autorizado')).toBeTruthy()
  })

  it('superadmin em /usuarios entra', () => {
    entrarComToken(tokenDe('superadmin'))
    montar()

    expect(screen.getByText('administração')).toBeTruthy()
  })
})
