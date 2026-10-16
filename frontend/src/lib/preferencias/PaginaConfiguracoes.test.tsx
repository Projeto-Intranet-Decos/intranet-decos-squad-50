import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { simularConsultasDeMidia, simularNavegador } from '../../testes/apoio'
import PaginaConfiguracoes from './PaginaConfiguracoes'
import { CHAVE_PREFERENCIAS, PREFERENCIAS_PADRAO, definirPreferencias, iniciarPreferencias, obterPreferencias } from './preferencias'

vi.mock('../../features/atalhos/api', async (original) => ({
  ...(await original<typeof import('../../features/atalhos/api')>()),
  listarAtalhos: vi.fn(async () => []),
}))

const raiz = document.documentElement

function tokenDe(role: string) {
  const carga = btoa(JSON.stringify({ sub: '1', role, setor_id: null }))
  return `cabecalho.${carga}.assinatura`
}

describe('GER-14 — página Configurações', () => {
  beforeEach(() => {
    iniciarPreferencias()
  })

  it('colaborador comum abre /configuracoes e encontra o item no menu lateral', () => {
    localStorage.setItem('intranet:token', tokenDe('comum'))
    simularConsultasDeMidia((consulta) => consulta.includes('min-width: 1024px'))

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/configuracoes']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Configurações' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Configurações' }).getAttribute('href')).toBe('/configuracoes')
  })

  it('vem com o Vidro líquido escolhido e troca para o Vidro clínico na hora', () => {
    render(<PaginaConfiguracoes />)

    expect((screen.getByRole('radio', { name: 'Vidro líquido' }) as HTMLInputElement).checked).toBe(true)

    fireEvent.click(screen.getByRole('radio', { name: 'Vidro clínico' }))

    expect(raiz.dataset.visual).toBe('clinico')
    expect((screen.getByRole('radio', { name: 'Vidro clínico' }) as HTMLInputElement).checked).toBe(true)
  })

  it('mostra os valores salvos', () => {
    definirPreferencias({ desfoque: 6, gradiente: 'desligado', visual: 'clinico', rolagemElastica: false })

    render(<PaginaConfiguracoes />)

    expect((screen.getByRole('radio', { name: 'Vidro clínico' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Desfoque do vidro') as HTMLInputElement).value).toBe('6')
    expect((screen.getByRole('radio', { name: 'Desligado' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('switch', { name: 'Efeito elástico na rolagem' }) as HTMLInputElement).checked).toBe(false)
  })

  it('aplica e grava cada ajuste na hora, sem botão de salvar', () => {
    render(<PaginaConfiguracoes />)

    fireEvent.change(screen.getByLabelText('Desfoque do vidro'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Transparência do vidro'), { target: { value: '90' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Intenso' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Efeito elástico na rolagem' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Reduzir animações' }))

    expect(raiz.style.getPropertyValue('--vidro-desfoque')).toBe('8px')
    expect(raiz.style.getPropertyValue('--vidro-transparencia')).toBe('1.5')
    expect(raiz.dataset.gradiente).toBe('intenso')
    expect(raiz.classList.contains('reduzir-animacoes')).toBe(true)
    expect(JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS)!)).toEqual({
      desfoque: 8,
      transparencia: 90,
      gradiente: 'intenso',
      visual: 'liquido',
      refracao: true,
      rolagemElastica: false,
      reduzirAnimacoes: true,
    })
    expect(screen.queryByRole('button', { name: /salvar/i })).toBeNull()
  })

  it('refração no carrossel: desativada fora do Chromium e no Vidro clínico', () => {
    render(<PaginaConfiguracoes />)
    const refracao = () => screen.getByRole('switch', { name: 'Refração no carrossel' }) as HTMLInputElement

    expect(refracao().disabled).toBe(true)
    expect(screen.getByText(/só no Chrome ou no Edge/)).toBeTruthy()
  })

  it('refração no carrossel: liga e desliga no Chromium com o Vidro líquido', () => {
    simularNavegador(['Chromium'])
    iniciarPreferencias()
    render(<PaginaConfiguracoes />)
    const refracao = () => screen.getByRole('switch', { name: 'Refração no carrossel' }) as HTMLInputElement

    expect(refracao().disabled).toBe(false)
    expect(refracao().checked).toBe(true)

    fireEvent.click(refracao())
    expect(raiz.classList.contains('refracao')).toBe(false)

    fireEvent.click(screen.getByRole('radio', { name: 'Vidro clínico' }))
    expect(refracao().disabled).toBe(true)
  })

  it('"Restaurar padrão" volta todas as opções', () => {
    definirPreferencias({ desfoque: 0, transparencia: 10, gradiente: 'intenso', visual: 'clinico' })
    render(<PaginaConfiguracoes />)

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar padrão' }))

    expect(obterPreferencias()).toEqual(PREFERENCIAS_PADRAO)
    expect((screen.getByRole('radio', { name: 'Vidro líquido' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Desfoque do vidro') as HTMLInputElement).value).toBe('16')
    expect((screen.getByRole('radio', { name: 'Suave' }) as HTMLInputElement).checked).toBe(true)
  })
})
