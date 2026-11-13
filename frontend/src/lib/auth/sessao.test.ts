import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, renovarAccessToken } from '../api'
import { iniciarSessao, sairDaConta } from './sessao'
import { entrarComToken, obterToken } from './useAuth'

vi.mock('../api', () => ({ api: { post: vi.fn() }, renovarAccessToken: vi.fn() }))

const MARCADOR = 'intranet:sessao'

afterEach(() => {
  vi.clearAllMocks()
})

describe('AUT-07 — credenciais fora do localStorage', () => {
  it('o access token fica só na memória; o localStorage guarda só o marcador', () => {
    entrarComToken('token-de-acesso')

    expect(obterToken()).toBe('token-de-acesso')
    expect(Object.keys(localStorage)).toEqual([MARCADOR])
    expect(Object.values(localStorage).join()).not.toContain('token-de-acesso')
  })

  it('ao abrir, apaga as chaves antigas de token', async () => {
    localStorage.setItem('intranet:token', 'antigo')
    localStorage.setItem('intranet:refresh_token', 'antigo')

    await iniciarSessao()

    expect(localStorage.getItem('intranet:token')).toBeNull()
    expect(localStorage.getItem('intranet:refresh_token')).toBeNull()
  })
})

describe('AUT-04 — renovação ao abrir a página', () => {
  it('com o marcador, renova pelo cookie antes de mostrar a tela', async () => {
    localStorage.setItem(MARCADOR, '1')
    vi.mocked(renovarAccessToken).mockResolvedValue('token-renovado')

    await iniciarSessao()

    expect(renovarAccessToken).toHaveBeenCalledOnce()
  })

  it('sem o marcador, é visitante e não chama a API', async () => {
    await iniciarSessao()

    expect(renovarAccessToken).not.toHaveBeenCalled()
    expect(obterToken()).toBeNull()
  })

  it('se a renovação falha, apaga o marcador e abre como visitante', async () => {
    localStorage.setItem(MARCADOR, '1')
    vi.mocked(renovarAccessToken).mockRejectedValue(new Error('401'))

    await iniciarSessao()

    expect(localStorage.getItem(MARCADOR)).toBeNull()
    expect(obterToken()).toBeNull()
  })

  it('outra aba saindo da conta faz esta esquecer o token', async () => {
    await iniciarSessao()
    entrarComToken('token-de-acesso')

    localStorage.removeItem(MARCADOR)
    window.dispatchEvent(new StorageEvent('storage', { key: MARCADOR, newValue: null }))

    expect(obterToken()).toBeNull()
  })

  it('outra aba entrando faz esta renovar e entrar também', async () => {
    await iniciarSessao()
    vi.mocked(renovarAccessToken).mockResolvedValue('token-da-outra-aba')

    window.dispatchEvent(new StorageEvent('storage', { key: MARCADOR, newValue: '1' }))

    expect(renovarAccessToken).toHaveBeenCalledOnce()
  })
})

describe('AUT-06 — sair da conta', () => {
  it('chama o logout no backend e esquece o token e o marcador', async () => {
    entrarComToken('token-de-acesso')
    vi.mocked(api.post).mockResolvedValue({ status: 204 })

    await sairDaConta()

    expect(api.post).toHaveBeenCalledWith('/auth/logout')
    expect(obterToken()).toBeNull()
    expect(localStorage.getItem(MARCADOR)).toBeNull()
  })

  it('esquece a sessão mesmo se o logout falhar', async () => {
    entrarComToken('token-de-acesso')
    vi.mocked(api.post).mockRejectedValue(new Error('rede'))

    await sairDaConta()

    expect(obterToken()).toBeNull()
    expect(localStorage.getItem(MARCADOR)).toBeNull()
  })
})
