import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Documento } from '../../features/documentos/types'
import type { Aviso } from '../../features/murais/types'
import { marcarNovidadesVistas } from '../../features/usuarios/api'
import Layout from '../../shared/components/Layout'
import { simularConsultasDeMidia, tokenDeAcessoFalso } from '../../testes/apoio'
import { entrarComToken } from '../auth/useAuth'
import { marcarIntroducaoVista } from '../introducao/useIntroducao'
import { iniciarPreferencias } from '../preferencias/preferencias'

const EU = 'u-eu'
const OUTRA = 'u-outra'

const dados = vi.hoisted(() => ({
  vistasEm: '2026-11-20T00:00:00Z',
  /** A última visita não chega (requisição pendurada). */
  vistasPendentes: false,
  /** Segura a busca dos avisos até a promessa resolver. */
  espera: null as Promise<void> | null,
  avisos: [] as Aviso[],
  documentos: [] as Documento[],
}))

vi.mock('../../features/usuarios/api', async (original) => ({
  ...(await original<typeof import('../../features/usuarios/api')>()),
  buscarNovidadesVistas: vi.fn(() =>
    dados.vistasPendentes ? new Promise<string>(() => {}) : Promise.resolve(dados.vistasEm),
  ),
  // Como o backend: marca até `ate` ou, sem ele, até "agora".
  marcarNovidadesVistas: vi.fn(async (ate?: string) => {
    dados.vistasEm = ate ?? '2026-11-27T12:00:00Z'
    return dados.vistasEm
  }),
}))

// Fazem o que o backend faz com o `desde` (GER-28).
vi.mock('../../features/murais/api', async (original) => ({
  ...(await original<typeof import('../../features/murais/api')>()),
  listarAvisos: vi.fn(async (desde?: string) => {
    if (dados.espera) await dados.espera
    return dados.avisos.filter((a) => !desde || a.criadoEm > desde)
  }),
}))
vi.mock('../../features/documentos/api', async (original) => ({
  ...(await original<typeof import('../../features/documentos/api')>()),
  listarDocumentos: vi.fn(async ({ desde }: { desde?: string } = {}) =>
    dados.documentos.filter((d) => !desde || d.versaoCriadaEm > desde),
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

/** `quando` é o envio da versão atual; `extra` troca autor, autor da versão ou `atualizadoEm`. */
function documento(
  id: string,
  titulo: string,
  versao: number,
  quando: string,
  extra: Partial<Documento> = {},
): Documento {
  return {
    id, titulo, descricao: null, categoria: 'pop', setorId: 's2', setorNome: 'Farmácia',
    nomeArquivo: 'pop.pdf', tipoConteudo: 'application/pdf', tamanhoBytes: 10, autorId: OUTRA,
    autorNome: 'Paulo', criadoEm: versao === 1 ? quando : '2025-01-01T00:00:00Z',
    atualizadoEm: versao === 1 ? null : quando, versao, versaoAutorId: OUTRA, versaoCriadaEm: quando,
    ...extra,
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

const sino = () => screen.getByRole<HTMLButtonElement>('button', { name: /^Novidades/ })

async function abrirModal() {
  await waitFor(() => expect(sino().disabled).toBe(false))
  fireEvent.click(sino())
  return screen.findByRole('dialog', { name: 'Novidades' })
}

describe('GER-28 — novidades desde a última visita', () => {
  beforeEach(() => {
    dados.vistasEm = '2026-11-20T00:00:00Z'
    dados.vistasPendentes = false
    dados.espera = null
    dados.avisos = []
    dados.documentos = []
    vi.mocked(marcarNovidadesVistas).mockClear()
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
    dados.avisos = [aviso('a1', 'Escala de dezembro', '2026-11-25T10:00:00Z')]
    dados.documentos = [
      documento('d1', 'POP de curativo', 3, '2026-11-26T10:00:00Z'),
      documento('d2', 'Manual da bomba', 1, '2026-11-24T10:00:00Z'),
    ]
    montar()
    await waitFor(() => expect(sino().getAttribute('aria-label')).toBe('Novidades: 3 novas'))

    const modal = await abrirModal()

    const itens = await within(modal).findAllByRole('button', { name: /POP|Escala|Manual/ })
    expect(itens.map((item) => item.textContent)).toEqual([
      expect.stringContaining('POP de curativo'),
      expect.stringContaining('Escala de dezembro'),
      expect.stringContaining('Manual da bomba'),
    ])
    expect(itens[0].textContent).toContain('Nova versão (v3) · Farmácia')
    expect(itens[1].textContent).toContain('Comunicado · Enfermagem')
    expect(itens[2].textContent).toContain('Documento novo · Farmácia')
    await waitFor(() => expect(marcarNovidadesVistas).toHaveBeenCalledWith('2026-11-26T10:00:00Z'))
    await waitFor(() => expect(sino().getAttribute('aria-label')).toBe('Novidades'))
    // A lista continua no modal até ele fechar.
    expect(within(modal).getByText('Escala de dezembro')).toBeTruthy()
  })

  it('sem novidades, o modal avisa que não há nada novo e nada é marcado', async () => {
    montar()

    const modal = await abrirModal()

    expect(await within(modal).findByText('Nada novo desde a sua última visita.')).toBeTruthy()
    expect(marcarNovidadesVistas).not.toHaveBeenCalled()
  })

  it('abrir o sino busca de novo: o que chegou depois da última busca aparece e é marcado até ele', async () => {
    dados.avisos = [aviso('a1', 'Escala de dezembro', '2026-11-25T10:00:00Z')]
    montar()
    await waitFor(() => expect(sino().getAttribute('aria-label')).toBe('Novidades: 1 nova'))
    // Publicado depois da última busca do sino, que só se repetiria em 5 minutos.
    dados.avisos = [...dados.avisos, aviso('a2', 'Plantão extra', '2026-11-25T12:00:00.123456Z')]

    const modal = await abrirModal()

    expect(await within(modal).findByText('Plantão extra')).toBeTruthy()
    expect(within(modal).getByText('Escala de dezembro')).toBeTruthy()
    // A precisão do backend (microssegundos) vai de volta intacta.
    await waitFor(() => expect(marcarNovidadesVistas).toHaveBeenCalledWith('2026-11-25T12:00:00.123456Z'))
  })

  it('enquanto a última visita não carregou, o sino fica desabilitado', async () => {
    dados.vistasPendentes = true
    dados.avisos = [aviso('a1', 'Escala de dezembro', '2026-11-25T10:00:00Z')]
    montar()

    await screen.findByTestId('endereco')
    expect(sino().disabled).toBe(true)
  })

  it('fechar o modal antes de a busca terminar não marca nada', async () => {
    dados.avisos = [aviso('a1', 'Escala de dezembro', '2026-11-25T10:00:00Z')]
    montar()
    await waitFor(() => expect(sino().getAttribute('aria-label')).toBe('Novidades: 1 nova'))
    let liberar!: () => void
    dados.espera = new Promise<void>((resolver) => {
      liberar = resolver
    })

    const modal = await abrirModal()
    expect(within(modal).getByText('Buscando novidades…')).toBeTruthy()
    fireEvent.click(within(modal).getByRole('button', { name: 'Fechar' }))
    liberar()

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novidades' })).toBeNull())
    await new Promise((resolver) => setTimeout(resolver, 20))
    expect(marcarNovidadesVistas).not.toHaveBeenCalled()
    expect(sino().getAttribute('aria-label')).toBe('Novidades: 1 nova')
  })

  it('num documento, conta quem enviou a versão atual, não quem criou o documento', async () => {
    dados.documentos = [
      // Criado por mim, versão nova de outra pessoa: é novidade.
      documento('d1', 'POP de curativo', 2, '2026-11-26T10:00:00Z', { autorId: EU }),
      // Criado por outra pessoa, versão nova minha: não é.
      documento('d2', 'Manual da bomba', 2, '2026-11-26T11:00:00Z', { versaoAutorId: EU }),
    ]
    montar()
    await waitFor(() => expect(sino().getAttribute('aria-label')).toBe('Novidades: 1 nova'))

    const modal = await abrirModal()

    expect(await within(modal).findByText('POP de curativo')).toBeTruthy()
    expect(within(modal).queryByText('Manual da bomba')).toBeNull()
  })

  it('a hora de uma versão nova é a do envio do arquivo, não a da última edição', async () => {
    dados.avisos = [aviso('a1', 'Escala de dezembro', '2026-11-25T12:00:00Z')]
    dados.documentos = [
      // v2 enviada às 9h; às 15h alguém só renomeou o documento.
      documento('d1', 'POP de curativo', 2, '2026-11-25T09:00:00Z', { atualizadoEm: '2026-11-25T15:00:00Z' }),
    ]
    montar()
    await waitFor(() => expect(sino().getAttribute('aria-label')).toBe('Novidades: 2 novas'))

    const modal = await abrirModal()

    const itens = await within(modal).findAllByRole('button', { name: /POP|Escala/ })
    expect(itens.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Escala de dezembro'),
      expect.stringContaining('POP de curativo'),
    ])
    expect(itens[1].querySelector('time')?.getAttribute('datetime')).toBe('2026-11-25T09:00:00Z')
  })

  it.each([
    ['um aviso', 'Escala de dezembro', '/mural?aviso=a1'],
    ['um documento', 'POP de curativo', '/documentos?documento=d1'],
  ])('clicar em %s abre a página com ele', async (_, titulo, destino) => {
    dados.avisos = [aviso('a1', 'Escala de dezembro', '2026-11-25T10:00:00Z')]
    dados.documentos = [documento('d1', 'POP de curativo', 1, '2026-11-26T10:00:00Z')]
    montar()
    await waitFor(() => expect(sino().getAttribute('aria-label')).toBe('Novidades: 2 novas'))

    await abrirModal()
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(titulo) }))

    await waitFor(() => expect(screen.getByTestId('endereco').textContent).toBe(destino))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novidades' })).toBeNull())
  })
})
