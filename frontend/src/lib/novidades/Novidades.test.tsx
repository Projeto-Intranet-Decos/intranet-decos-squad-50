import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Documento } from '../../features/documentos/types'
import type { Aviso } from '../../features/murais/types'
import Layout from '../../shared/components/Layout'
import { simularConsultasDeMidia, tokenDeAcessoFalso } from '../../testes/apoio'
import { entrarComToken } from '../auth/useAuth'
import { marcarIntroducaoVista } from '../introducao/useIntroducao'
import { iniciarPreferencias } from '../preferencias/preferencias'

const EU = 'u-eu'
const OUTRA = 'u-outra'

const dados = vi.hoisted(() => ({
  vistasEm: '2026-11-20T00:00:00Z',
  avisos: [] as Aviso[],
  documentos: [] as Documento[],
}))

vi.mock('../../features/usuarios/api', async (original) => ({
  ...(await original<typeof import('../../features/usuarios/api')>()),
  buscarNovidadesVistas: vi.fn(async () => dados.vistasEm),
  marcarNovidadesVistas: vi.fn(async () => {
    dados.vistasEm = '2026-11-27T12:00:00Z'
    return dados.vistasEm
  }),
}))

// Fazem o que o backend faz com o `desde` (GER-28).
vi.mock('../../features/murais/api', async (original) => ({
  ...(await original<typeof import('../../features/murais/api')>()),
  listarAvisos: vi.fn(async (desde?: string) => dados.avisos.filter((a) => !desde || a.criadoEm > desde)),
}))
vi.mock('../../features/documentos/api', async (original) => ({
  ...(await original<typeof import('../../features/documentos/api')>()),
  listarDocumentos: vi.fn(async ({ desde }: { desde?: string } = {}) =>
    dados.documentos.filter((d) => !desde || (d.atualizadoEm ?? d.criadoEm) > desde),
  ),
}))
vi.mock('../../features/atalhos/api', async (original) => ({
  ...(await original<typeof import('../../features/atalhos/api')>()),
  listarAtalhos: vi.fn(async () => []),
}))

function aviso(id: string, titulo: string, criadoEm: string, autorId = OUTRA): Aviso {
  return {
    id, titulo, conteudo: 'texto', urlImagem: null, categoria: 'comunicado', dataInicio: null,
    dataFim: null, fixado: false, autorId, autorNome: 'Marina', setorId: 's1', setorNome: 'Enfermagem',
    anexos: [], criadoEm, atualizadoEm: null,
  }
}

function documento(id: string, titulo: string, versao: number, quando: string): Documento {
  return {
    id, titulo, descricao: null, categoria: 'pop', setorId: 's2', setorNome: 'Farmácia',
    nomeArquivo: 'pop.pdf', tipoConteudo: 'application/pdf', tamanhoBytes: 10, autorId: OUTRA,
    autorNome: 'Paulo', criadoEm: versao === 1 ? quando : '2025-01-01T00:00:00Z',
    atualizadoEm: versao === 1 ? null : quando, versao,
  }
}

function Endereco() {
  const { pathname, search } = useLocation()
  return <p data-testid="endereco">{pathname + search}</p>
}

function montar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/setores']}>
        <Routes>
          <Route path="*" element={<Layout><Endereco /></Layout>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const sino = () => screen.getByRole('button', { name: /^Novidades/ })

describe('GER-28 — novidades desde a última visita', () => {
  beforeEach(() => {
    dados.vistasEm = '2026-11-20T00:00:00Z'
    dados.avisos = []
    dados.documentos = []
    entrarComToken(tokenDeAcessoFalso({ sub: EU, nome: 'Eu', role: 'comum', setor_id: null }))
    marcarIntroducaoVista(EU)
    simularConsultasDeMidia((consulta) => consulta.includes('min-width: 1024px'))
    iniciarPreferencias()
  })

  it('o sino conta o que outras pessoas publicaram depois da última visita', async () => {
    dados.avisos = [
      aviso('a1', 'Escala de dezembro', '2026-11-25T10:00:00Z'),
      aviso('a2', 'Meu próprio aviso', '2026-11-25T11:00:00Z', EU),
      aviso('a3', 'Aviso antigo', '2026-11-10T10:00:00Z'),
    ]
    dados.documentos = [documento('d1', 'POP de curativo', 2, '2026-11-26T10:00:00Z')]
    montar()

    await waitFor(() => expect(sino().getAttribute('aria-label')).toBe('Novidades: 2 novas'))
    expect(within(sino()).getByText('2')).toBeTruthy()
  })

  it('acima de 9 o sino mostra "9+"', async () => {
    dados.avisos = Array.from({ length: 12 }, (_, i) =>
      aviso(`a${i}`, `Aviso ${i}`, `2026-11-25T${String(10 + i).padStart(2, '0')}:00:00Z`),
    )
    montar()

    await waitFor(() => expect(within(sino()).getByText('9+')).toBeTruthy())
    expect(sino().getAttribute('aria-label')).toBe('Novidades: 12 novas')
  })

  it('abrir o sino lista as novidades, marca como vistas e a contagem some', async () => {
    const { marcarNovidadesVistas } = await import('../../features/usuarios/api')
    dados.avisos = [aviso('a1', 'Escala de dezembro', '2026-11-25T10:00:00Z')]
    dados.documentos = [
      documento('d1', 'POP de curativo', 3, '2026-11-26T10:00:00Z'),
      documento('d2', 'Manual da bomba', 1, '2026-11-24T10:00:00Z'),
    ]
    montar()
    await waitFor(() => expect(sino().getAttribute('aria-label')).toBe('Novidades: 3 novas'))

    fireEvent.click(sino())

    const modal = await screen.findByRole('dialog', { name: 'Novidades' })
    const itens = within(modal).getAllByRole('button', { name: /POP|Escala|Manual/ })
    expect(itens.map((item) => item.textContent)).toEqual([
      expect.stringContaining('POP de curativo'),
      expect.stringContaining('Escala de dezembro'),
      expect.stringContaining('Manual da bomba'),
    ])
    expect(itens[0].textContent).toContain('Nova versão (v3) · Farmácia')
    expect(itens[1].textContent).toContain('Comunicado · Enfermagem')
    expect(itens[2].textContent).toContain('Documento novo · Farmácia')
    expect(marcarNovidadesVistas).toHaveBeenCalled()
    await waitFor(() => expect(sino().getAttribute('aria-label')).toBe('Novidades'))
    // A lista continua no modal até ele fechar.
    expect(within(modal).getByText('Escala de dezembro')).toBeTruthy()
  })

  it('sem novidades, o modal avisa que não há nada novo', async () => {
    montar()

    fireEvent.click(sino())

    const modal = await screen.findByRole('dialog', { name: 'Novidades' })
    expect(within(modal).getByText('Nada novo desde a sua última visita.')).toBeTruthy()
  })

  it.each([
    ['um aviso', 'Escala de dezembro', '/mural?aviso=a1'],
    ['um documento', 'POP de curativo', '/documentos?documento=d1'],
  ])('clicar em %s abre a página com ele', async (_, titulo, destino) => {
    dados.avisos = [aviso('a1', 'Escala de dezembro', '2026-11-25T10:00:00Z')]
    dados.documentos = [documento('d1', 'POP de curativo', 1, '2026-11-26T10:00:00Z')]
    montar()
    await waitFor(() => expect(sino().getAttribute('aria-label')).toBe('Novidades: 2 novas'))

    fireEvent.click(sino())
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(titulo) }))

    await waitFor(() => expect(screen.getByTestId('endereco').textContent).toBe(destino))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novidades' })).toBeNull())
  })
})
