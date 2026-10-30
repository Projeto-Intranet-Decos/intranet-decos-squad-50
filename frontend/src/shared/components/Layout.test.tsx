import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { definirPreferencias, iniciarPreferencias } from '../../lib/preferencias/preferencias'
import { simularConsultasDeMidia, tokenDeAcessoFalso } from '../../testes/apoio'
import estilos from '../../index.css?raw'
import { salvarAccessToken } from '../../lib/auth/useAuth'
import Layout from './Layout'

const renovacao = vi.hoisted(() => ({ token: '' }))
vi.mock('../../lib/api', async (original) => {
  const modulo = await original<typeof import('../../lib/api')>()
  const { salvarAccessToken: salvar } = await import('../../lib/auth/useAuth')
  return {
    ...modulo,
    // Faz o que a renovação real faz: grava o access token novo que a API devolveu. Sem token
    // configurado no teste, falha, como uma renovação recusada: nada muda.
    renovarAccessToken: vi.fn(async () => {
      if (!renovacao.token) throw new Error('Renovação não configurada neste teste')
      salvar(renovacao.token)
      return renovacao.token
    }),
  }
})

beforeEach(() => {
  renovacao.token = ''
})

vi.mock('../../features/atalhos/api', async (original) => ({
  ...(await original<typeof import('../../features/atalhos/api')>()),
  listarAtalhos: vi.fn(async () => []),
}))

// Mesmo arranjo do App: cada rota embrulha a própria página no Layout.
function Aplicacao() {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/mural']}>
        <Routes>
          <Route path="/mural" element={<Layout><p>Página do mural</p></Layout>} />
          <Route path="/documentos" element={<Layout><p>Página de documentos</p></Layout>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
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

// O jsdom não aplica o Tailwind, então o branco do vidro é conferido no próprio CSS.
function fundoDoUtilitario(nome: string) {
  const bloco = estilos.match(new RegExp(`@utility ${nome} \\{[\\s\\S]*?\\n\\}`))?.[0]
  const fundo = bloco?.match(/background:[^;]*;/)?.[0]
  if (!fundo) throw new Error(`utilitário ${nome} sem background`)
  return fundo
}

describe('GER-01 — rótulos do menu em frase normal no Vidro líquido', () => {
  beforeEach(() => {
    const carga = btoa(JSON.stringify({ sub: '1', role: 'superadmin', setor_id: null }))
    localStorage.setItem('intranet:token', `cabecalho.${carga}.assinatura`)
    simularConsultasDeMidia((consulta) => consulta.includes('min-width: 1024px'))
    iniciarPreferencias()
  })

  it('o texto é escrito em frase normal e a caixa alta fica só no CSS do Vidro clínico', () => {
    render(<Aplicacao />)

    for (const rotulo of ['Intranet', 'Páginas', 'Administração', 'Acesso rápido']) {
      const elemento = screen.getByText(rotulo)
      expect(elemento.className).toContain('uppercase')
      expect(elemento.className).toContain('liquido:normal-case')
    }
  })
})

describe('GER-19 — seções colapsáveis do menu lateral', () => {
  beforeEach(() => {
    const carga = btoa(JSON.stringify({ sub: '1', role: 'superadmin', setor_id: null }))
    localStorage.setItem('intranet:token', `cabecalho.${carga}.assinatura`)
    simularConsultasDeMidia((consulta) => consulta.includes('min-width: 1024px'))
    iniciarPreferencias()
  })

  it('clicar no cabeçalho da seção alterna aria-expanded', () => {
    render(<Aplicacao />)

    const cabecalho = screen.getByRole('button', { name: 'Páginas' })
    expect(cabecalho.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(cabecalho)
    expect(cabecalho.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(cabecalho)
    expect(cabecalho.getAttribute('aria-expanded')).toBe('true')
  })

  it('com animações reduzidas, colapsar some com os itens na hora', () => {
    definirPreferencias({ reduzirAnimacoes: true })
    render(<Aplicacao />)

    expect(screen.getByRole('link', { name: 'Usuários' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Administração' }))
    expect(screen.queryByRole('link', { name: 'Usuários' })).toBeNull()
  })

  it('no menu recolhido para ícones, a seção colapsada ainda mostra os itens', async () => {
    render(<Aplicacao />)

    fireEvent.click(screen.getByRole('button', { name: 'Páginas' }))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Mural de avisos' })).toBeNull())

    fireEvent.click(screen.getByTitle('Recolher menu'))
    expect(screen.getByTitle('Mural de avisos')).toBeTruthy()
  })
})

describe('GER-01 — menu em tela cheia abaixo de 1024px', () => {
  beforeEach(() => {
    const carga = btoa(JSON.stringify({ sub: '1', role: 'comum', setor_id: null }))
    localStorage.setItem('intranet:token', `cabecalho.${carga}.assinatura`)
    simularConsultasDeMidia(() => false)
    iniciarPreferencias()
  })

  // O jsdom não aplica o Tailwind: confere as classes que posicionam o menu fora do desktop.
  it('o menu cobre a tela toda, sem margem nem cantos arredondados', () => {
    render(<Aplicacao />)

    const classes = screen.getByRole('complementary', { hidden: true }).className.split(' ')
    const semVariante = classes.filter((classe) => !classe.includes(':'))
    expect(semVariante).toContain('inset-0')
    expect(semVariante).toContain('w-full')
    expect(semVariante.some((classe) => classe.startsWith('rounded') || classe.startsWith('max-w'))).toBe(false)
  })

  it('o botão "Fechar menu" fecha o menu e devolve o foco ao botão que o abriu', () => {
    render(<Aplicacao />)
    const abrir = screen.getByRole('button', { name: 'Abrir menu' })

    fireEvent.click(abrir)
    expect(abrir.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Fechar menu' }))
    expect(abrir.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(abrir)
  })
})

describe('GER-01 🐞 — menu sem botão de fechar no desktop', () => {
  beforeEach(() => {
    const carga = btoa(JSON.stringify({ sub: '1', role: 'comum', setor_id: null }))
    localStorage.setItem('intranet:token', `cabecalho.${carga}.assinatura`)
    simularConsultasDeMidia((consulta) => consulta.includes('min-width: 1024px'))
    iniciarPreferencias()
  })

  // O btn-icon do Vidro líquido define display e derrubava o lg:hidden: o botão nem é montado.
  it('o menu lateral não tem o botão "Fechar menu"', () => {
    render(<Aplicacao />)

    expect(screen.queryByRole('button', { name: 'Fechar menu' })).toBeNull()
  })
})

describe('GER-18 — vidro do menu e da barra superior', () => {
  beforeEach(() => {
    const carga = btoa(JSON.stringify({ sub: '1', role: 'comum', setor_id: null }))
    localStorage.setItem('intranet:token', `cabecalho.${carga}.assinatura`)
    simularConsultasDeMidia(() => false)
    iniciarPreferencias()
  })

  it('a barra superior e o menu lateral usam o vidro estrutural', () => {
    render(<Aplicacao />)

    expect(screen.getByRole('banner').className).toContain('glass')
    expect(screen.getByRole('complementary').className).toContain('glass')
  })

  it('o vidro estrutural é tão branco quanto o dos modais', () => {
    expect(fundoDoUtilitario('glass')).toBe(fundoDoUtilitario('glass-modal'))
  })
})

describe('USU-07 — botão de alterar senha', () => {
  beforeEach(() => {
    const carga = btoa(JSON.stringify({ sub: '1', role: 'comum', setor_id: null }))
    localStorage.setItem('intranet:token', `cabecalho.${carga}.assinatura`)
    simularConsultasDeMidia((consulta) => consulta.includes('min-width: 1024px'))
    iniciarPreferencias()
  })

  it('fica ao lado de Sair e abre o modal', async () => {
    render(<Aplicacao />)

    fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }))

    expect(await screen.findByRole('dialog', { name: 'Alterar senha' })).toBeTruthy()
  })
})

describe('AUT-03 — indicador do usuário logado', () => {
  function entrarComo(carga: object) {
    localStorage.setItem('intranet:token', tokenDeAcessoFalso(carga))
    simularConsultasDeMidia((consulta) => consulta.includes('min-width: 1024px'))
    iniciarPreferencias()
    render(<Aplicacao />)
  }

  it('mostra o nome e não o papel de quem não é superadmin', () => {
    entrarComo({ sub: '1', nome: 'Maria Silva', role: 'admin_setor', setor_id: 's1' })

    expect(screen.getByText('Maria Silva')).toBeTruthy()
    expect(screen.queryByText('Administrador de setor')).toBeNull()
  })

  it('mostra o papel abaixo do nome para o superadmin', () => {
    entrarComo({ sub: '1', nome: 'Ana Souza', role: 'superadmin', setor_id: null })

    expect(screen.getByText('Ana Souza')).toBeTruthy()
    expect(screen.getByText('Superadministrador')).toBeTruthy()
  })
})

describe('AUT-03 🐞 — indicador acompanha o token', () => {
  beforeEach(() => {
    simularConsultasDeMidia((consulta) => consulta.includes('min-width: 1024px'))
    iniciarPreferencias()
  })

  it('token renovado atualiza o indicador sem recarregar a página', async () => {
    localStorage.setItem('intranet:token', tokenDeAcessoFalso({ sub: '1', nome: 'Nome Antigo', role: 'comum', setor_id: null }))
    render(<Aplicacao />)
    expect(screen.getByText('Nome Antigo')).toBeTruthy()

    act(() => salvarAccessToken(tokenDeAcessoFalso({ sub: '1', nome: 'Nome Novo', role: 'comum', setor_id: null })))

    expect(await screen.findByText('Nome Novo')).toBeTruthy()
  })

  it('token emitido antes do nome é renovado na hora e o nome aparece', async () => {
    renovacao.token = tokenDeAcessoFalso({ sub: '1', nome: 'Maria Silva', role: 'comum', setor_id: null })
    localStorage.setItem('intranet:token', tokenDeAcessoFalso({ sub: '1', role: 'comum', setor_id: null }))

    render(<Aplicacao />)

    expect(await screen.findByText('Maria Silva')).toBeTruthy()
  })
})
