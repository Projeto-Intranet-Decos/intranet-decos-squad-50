import { describe, expect, it, vi } from 'vitest'
import {
  CHAVE_PREFERENCIAS,
  PREFERENCIAS_PADRAO,
  definirPreferencias,
  iniciarPreferencias,
  inscreverPreferencias,
  obterPreferencias,
  restaurarPreferencias,
} from './preferencias'

const raiz = document.documentElement

function salvo() {
  return JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS) ?? 'null')
}

describe('GER-14 — preferências de interface', () => {
  it('usa os padrões e já os aplica no <html> quando nada foi salvo', () => {
    iniciarPreferencias()

    expect(obterPreferencias()).toEqual(PREFERENCIAS_PADRAO)
    expect(raiz.style.getPropertyValue('--vidro-desfoque')).toBe('16px')
    expect(raiz.style.getPropertyValue('--vidro-transparencia')).toBe('1')
    expect(raiz.dataset.gradiente).toBe('suave')
    expect(raiz.classList.contains('rolagem-elastica')).toBe(true)
    expect(raiz.classList.contains('reduzir-animacoes')).toBe(false)
    expect(raiz.classList.contains('sem-desfoque')).toBe(false)
  })

  it('aplica a mudança na hora, grava e avisa quem está inscrito', () => {
    iniciarPreferencias()
    const aoMudar = vi.fn()
    const cancelar = inscreverPreferencias(aoMudar)

    definirPreferencias({ desfoque: 8, transparencia: 30, gradiente: 'intenso' })

    expect(obterPreferencias()).toEqual({ ...PREFERENCIAS_PADRAO, desfoque: 8, transparencia: 30, gradiente: 'intenso' })
    expect(raiz.style.getPropertyValue('--vidro-desfoque')).toBe('8px')
    expect(raiz.style.getPropertyValue('--vidro-transparencia')).toBe('0.5')
    expect(raiz.dataset.gradiente).toBe('intenso')
    expect(salvo()).toMatchObject({ desfoque: 8, transparencia: 30, gradiente: 'intenso' })
    expect(aoMudar).toHaveBeenCalledTimes(1)

    cancelar()
    definirPreferencias({ desfoque: 10 })
    expect(aoMudar).toHaveBeenCalledTimes(1)
  })

  it('restaura o que foi salvo ao iniciar de novo (recarregar a página)', () => {
    iniciarPreferencias()
    definirPreferencias({ desfoque: 4, rolagemElastica: false })
    raiz.removeAttribute('style')
    raiz.removeAttribute('class')

    iniciarPreferencias()

    expect(obterPreferencias()).toMatchObject({ desfoque: 4, rolagemElastica: false })
    expect(raiz.style.getPropertyValue('--vidro-desfoque')).toBe('4px')
    expect(raiz.classList.contains('rolagem-elastica')).toBe(false)
  })

  it('volta ao padrão só o campo inválido e mantém os demais', () => {
    localStorage.setItem(
      CHAVE_PREFERENCIAS,
      JSON.stringify({ desfoque: 999, transparencia: 'muita', gradiente: 'arco-iris', rolagemElastica: false, reduzirAnimacoes: 1 }),
    )

    iniciarPreferencias()

    expect(obterPreferencias()).toEqual({ ...PREFERENCIAS_PADRAO, rolagemElastica: false })
  })

  it('usa os padrões quando o valor salvo não é um JSON válido', () => {
    localStorage.setItem(CHAVE_PREFERENCIAS, '{corrompido')

    iniciarPreferencias()

    expect(obterPreferencias()).toEqual(PREFERENCIAS_PADRAO)
  })

  it('com desfoque 0 e transparência 0 o vidro fica sólido e sem backdrop-filter', () => {
    iniciarPreferencias()

    definirPreferencias({ desfoque: 0, transparencia: 0 })

    expect(raiz.classList.contains('sem-desfoque')).toBe(true)
    expect(raiz.style.getPropertyValue('--vidro-transparencia')).toBe('0')
  })

  it('reduzir animações marca o <html> e desliga o efeito elástico', () => {
    iniciarPreferencias()

    definirPreferencias({ reduzirAnimacoes: true })

    expect(raiz.classList.contains('reduzir-animacoes')).toBe(true)
    expect(raiz.classList.contains('rolagem-elastica')).toBe(false)
  })

  it('restaurar padrão desfaz todas as mudanças', () => {
    iniciarPreferencias()
    definirPreferencias({ desfoque: 0, transparencia: 100, gradiente: 'desligado', rolagemElastica: false, reduzirAnimacoes: true })

    restaurarPreferencias()

    expect(obterPreferencias()).toEqual(PREFERENCIAS_PADRAO)
    expect(raiz.style.getPropertyValue('--vidro-desfoque')).toBe('16px')
    expect(raiz.dataset.gradiente).toBe('suave')
    expect(salvo()).toEqual(PREFERENCIAS_PADRAO)
  })
})
