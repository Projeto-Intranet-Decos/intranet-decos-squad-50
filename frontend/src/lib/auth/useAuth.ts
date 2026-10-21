import { useState } from 'react'
import type { Usuario } from './tipos'

const CHAVE_ACCESS_TOKEN = 'intranet:token'
const CHAVE_REFRESH_TOKEN = 'intranet:refresh_token'

function decodificarUsuario(token: string): Usuario {
  const payload = token.split('.')[1]
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
  const carga = JSON.parse(json)
  // Token emitido antes de o nome entrar no payload: fica sem nome até a próxima renovação.
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
}

export function limparTokens() {
  localStorage.removeItem(CHAVE_ACCESS_TOKEN)
  localStorage.removeItem(CHAVE_REFRESH_TOKEN)
}

export function useAuth() {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const token = obterToken()
    return token ? decodificarUsuario(token) : null
  })

  function entrar(accessToken: string, refreshToken: string) {
    salvarAccessToken(accessToken)
    localStorage.setItem(CHAVE_REFRESH_TOKEN, refreshToken)
    setUsuario(decodificarUsuario(accessToken))
  }

  function sair() {
    limparTokens()
    setUsuario(null)
  }

  return { usuario, entrar, sair }
}
