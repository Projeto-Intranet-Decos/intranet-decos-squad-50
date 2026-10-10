import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { simularConsultasDeMidia } from '../../testes/apoio'
import PaginaConfiguracoes from './PaginaConfiguracoes'
import { CHAVE_PREFERENCIAS, PREFERENCIAS_PADRAO, definirPreferencias, iniciarPreferencias, obterPreferencias } from './preferencias'

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
      <MemoryRouter initialEntries={['/configuracoes']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Configurações' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Configurações' }).getAttribute('href')).toBe('/configuracoes')
  })

  it('mostra os valores salvos', () => {
    definirPreferencias({ desfoque: 6, gradiente: 'desligado', rolagemElastica: false })

    render(<PaginaConfiguracoes />)

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
      rolagemElastica: false,
      reduzirAnimacoes: true,
    })
    expect(screen.queryByRole('button', { name: /salvar/i })).toBeNull()
  })

  it('"Restaurar padrão" volta todas as opções', () => {
    definirPreferencias({ desfoque: 0, transparencia: 10, gradiente: 'intenso' })
    render(<PaginaConfiguracoes />)

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar padrão' }))

    expect(obterPreferencias()).toEqual(PREFERENCIAS_PADRAO)
    expect((screen.getByLabelText('Desfoque do vidro') as HTMLInputElement).value).toBe('16')
    expect((screen.getByRole('radio', { name: 'Suave' }) as HTMLInputElement).checked).toBe(true)
  })
})
