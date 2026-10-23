import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useOrdenacaoClique } from './useOrdenacaoClique'

describe('GER-20 — ordenação pelo cabeçalho da tabela', () => {
  it('começa com a coluna e direção informadas', () => {
    const { result } = renderHook(() => useOrdenacaoClique('nome'))
    expect(result.current.coluna).toBe('nome')
    expect(result.current.direcao).toBe('asc')
  })

  it('aceita uma direção inicial diferente de asc', () => {
    const { result } = renderHook(() => useOrdenacaoClique('data', 'desc'))
    expect(result.current.direcao).toBe('desc')
  })

  it('clicar na coluna ativa inverte a direção', () => {
    const { result } = renderHook(() => useOrdenacaoClique('nome'))

    act(() => result.current.aoClicarColuna('nome'))
    expect(result.current.coluna).toBe('nome')
    expect(result.current.direcao).toBe('desc')

    act(() => result.current.aoClicarColuna('nome'))
    expect(result.current.direcao).toBe('asc')
  })

  it('clicar em outra coluna troca a coluna e volta para asc', () => {
    const { result } = renderHook(() => useOrdenacaoClique<'nome' | 'ramal'>('nome'))

    act(() => result.current.aoClicarColuna('nome'))
    expect(result.current.direcao).toBe('desc')

    act(() => result.current.aoClicarColuna('ramal'))
    expect(result.current.coluna).toBe('ramal')
    expect(result.current.direcao).toBe('asc')
  })
})
