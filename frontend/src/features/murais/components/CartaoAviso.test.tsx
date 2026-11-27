import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Aviso } from '../types'
import CartaoAviso from './CartaoAviso'

function aviso(dados: Partial<Aviso> = {}): Aviso {
  return {
    id: 'a1',
    titulo: 'Campanha de vacinação',
    conteudo: 'texto',
    urlImagem: '/murais/avisos/a1/imagem?v=1',
    categoria: 'comunicado',
    dataInicio: null,
    dataFim: null,
    fixado: false,
    autorId: 'u1',
    autorNome: 'Marina',
    setorId: 's1',
    setorNome: 'Enfermagem',
    anexos: [],
    criadoEm: '2026-10-10T10:00:00Z',
    atualizadoEm: null,
    ...dados,
  }
}

function montar(detalhe: Aviso) {
  return render(
    <CartaoAviso
      aviso={detalhe}
      diaTexto="10 out"
      corPonto="red"
      podeGerenciar={false}
      aoAbrir={() => {}}
      aoEditar={() => {}}
      aoExcluir={() => {}}
    />,
  )
}

describe('MUR-11 — capa no card do feed', () => {
  it('mostra a capa inteira num quadro 16:9, com a própria imagem desfocada de fundo', () => {
    const { container } = montar(aviso())

    const capa = screen.getByRole('img', { name: 'Campanha de vacinação' })
    expect(capa.className).toContain('object-contain')
    expect(capa.parentElement?.className).toContain('aspect-video')

    const fundo = container.querySelector('img[aria-hidden="true"]')
    expect(fundo?.getAttribute('src')).toBe('/murais/avisos/a1/imagem?v=1')
    expect(fundo?.className).toContain('object-cover')
    expect(fundo?.className).toContain('blur')
  })

  it('limita o título a 2 linhas, para a altura do card não depender do texto', () => {
    montar(aviso())

    expect(screen.getByRole('heading', { level: 3 }).className).toContain('line-clamp-2')
  })

  it('aviso sem capa não mostra imagem', () => {
    const { container } = montar(aviso({ urlImagem: null }))

    expect(container.querySelector('img')).toBeNull()
  })
})
