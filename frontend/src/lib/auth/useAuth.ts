import { useMemo, useSyncExternalStore } from 'react'
import type { Usuario } from './tipos'

const CHAVE_ACCESS_TOKEN = 'intranet:token'
const CHAVE_REFRESH_TOKEN = 'intranet:refresh_token'

// Quem usa o useAuth é avisado quando o token muda (login, renovação pelo interceptor, saída):
// sem isso, o usuário era lido do token só ao montar a tela (AUT-03).
const ouvintes = new Set<() => void>()

function avisarOuvintes() {
  ouvintes.forEach((ouvinte) => ouvinte())
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

function decodificarUsuario(token: string): Usuario {
  const payload = token.split('.')[1]
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
  const carga = JSON.parse(json)
  // Token emitido antes de o nome entrar no payload: o Layout pede uma renovação na hora.
  return { id: carga.sub, nome: carga.nome ?? '', role: carga.role, setorId: carga.setor_id }
}

export function obterToken() {
  return localStorage.getItem(CHAVE_ACCESS_TOKEN)
}

export function obterRefreshToken() {
  return localStorage.getItem(CHAVE_REFRESH_TOKEN)
}

export function salvarAccessToken(token: string) {
  localStorage.setItem(CHAVE_ACCESS_TOKEN, token)
  avisarOuvintes()
}

export function limparTokens() {
  localStorage.removeItem(CHAVE_ACCESS_TOKEN)
  localStorage.removeItem(CHAVE_REFRESH_TOKEN)
  avisarOuvintes()
}

export function useAuth() {
  const token = useSyncExternalStore(inscrever, obterToken)
  const usuario = useMemo(() => (token ? decodificarUsuario(token) : null), [token])

  function entrar(accessToken: string, refreshToken: string) {
    localStorage.setItem(CHAVE_REFRESH_TOKEN, refreshToken)
    salvarAccessToken(accessToken)
  }

  function sair() {
    limparTokens()
  }

  return { usuario, entrar, sair }
}
