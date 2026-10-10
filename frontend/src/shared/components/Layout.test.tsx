import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { definirPreferencias, iniciarPreferencias } from '../../lib/preferencias/preferencias'
import { simularConsultasDeMidia } from '../../testes/apoio'
import Layout from './Layout'

// Mesmo arranjo do App: cada rota embrulha a própria página no Layout.
function Aplicacao() {
  return (
    <MemoryRouter initialEntries={['/mural']}>
      <Routes>
        <Route path="/mural" element={<Layout><p>Página do mural</p></Layout>} />
        <Route path="/documentos" element={<Layout><p>Página de documentos</p></Layout>} />
      </Routes>
    </MemoryRouter>
  )
}

function irParaDocumentos() {
  fireEvent.click(screen.getByRole('link', { name: 'POPs & documentos' }))
}

describe('GER-17 — transição entre páginas', () => {
  beforeEach(() => {
    const carga = btoa(JSON.stringify({ sub: '1', role: 'comum', setor_id: null }))
    localStorage.setItem('intranet:token', `cabecalho.${carga}.assinatura`)
    simularConsultasDeMidia((consulta) => consulta.includes('min-width: 1024px'))
    iniciarPreferencias()
  })

  it('a página atual sai antes de a nova entrar', async () => {
    render(<Aplicacao />)

    irParaDocumentos()

    expect(screen.queryByText('Página de documentos')).toBeNull()
    expect(screen.getByText('Página do mural')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Página de documentos')).toBeTruthy())
    expect(screen.queryByText('Página do mural')).toBeNull()
  })

  it('o menu lateral não é remontado e o indicador vai para o item da nova página', async () => {
    render(<Aplicacao />)
    const menu = screen.getByRole('complementary')
    fireEvent.click(screen.getByTitle('Recolher menu'))
    const indicadores = () => [...menu.querySelectorAll('.item-ativo')]
    expect(indicadores()).toHaveLength(1)
    expect(indicadores()[0].closest('a')?.getAttribute('href')).toBe('/mural')

    fireEvent.click(screen.getByTitle('POPs & documentos'))
    await waitFor(() => expect(screen.getByText('Página de documentos')).toBeTruthy())

    expect(screen.getByRole('complementary')).toBe(menu)
    expect(screen.getByTitle('Expandir menu')).toBeTruthy()
    expect(indicadores()).toHaveLength(1)
    expect(indicadores()[0].closest('a')?.getAttribute('href')).toBe('/documentos')
  })

  it('com animações reduzidas a troca é imediata', () => {
    definirPreferencias({ reduzirAnimacoes: true })
    render(<Aplicacao />)

    irParaDocumentos()

    expect(screen.getByText('Página de documentos')).toBeTruthy()
    expect(screen.queryByText('Página do mural')).toBeNull()
  })

  it('com prefers-reduced-motion a troca é imediata', () => {
    simularConsultasDeMidia(() => true)
    render(<Aplicacao />)

    irParaDocumentos()

    expect(screen.getByText('Página de documentos')).toBeTruthy()
    expect(screen.queryByText('Página do mural')).toBeNull()
  })
})
