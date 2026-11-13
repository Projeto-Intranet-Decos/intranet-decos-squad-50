import { useMemo, useSyncExternalStore } from 'react'
import type { Usuario } from './tipos'

// AUT-07: o access token vive só na memória da aba; o refresh token, no cookie HttpOnly, que o
// JavaScript nem enxerga. No localStorage fica só este marcador sem segredo, que diz se vale
// renovar ao abrir a página (AUT-04) e avisa as outras abas de entrada e saída.
export const CHAVE_MARCADOR_SESSAO = 'intranet:sessao'
// Onde os tokens ficavam antes do cookie; apagadas ao abrir (sessao.ts).
export const CHAVES_ANTIGAS = ['intranet:token', 'intranet:refresh_token']

let tokenEmMemoria: string | null = null

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
  return tokenEmMemoria
}

/** Se há sessão para renovar pelo cookie (esta ou outra aba entrou e ninguém saiu). */
export function temMarcadorDeSessao() {
  try {
    return localStorage.getItem(CHAVE_MARCADOR_SESSAO) !== null
  } catch {
    return false
  }
}

function gravarMarcador(presente: boolean) {
  try {
    if (presente) localStorage.setItem(CHAVE_MARCADOR_SESSAO, '1')
    else localStorage.removeItem(CHAVE_MARCADOR_SESSAO)
  } catch {
    // Sem localStorage (modo privado restrito): a sessão vale só enquanto a aba estiver aberta.
  }
}

export function salvarAccessToken(token: string) {
  tokenEmMemoria = token
  avisarOuvintes()
}

/** Abre a sessão nesta aba: token na memória e marcador para as outras abas e para o próximo F5. */
export function entrarComToken(token: string) {
  gravarMarcador(true)
  salvarAccessToken(token)
}

/** Só esta aba: as outras ficam sabendo pelo evento `storage` do marcador (sessao.ts). */
export function esquecerTokenDaAba() {
  tokenEmMemoria = null
  avisarOuvintes()
}

export function limparTokens() {
  gravarMarcador(false)
  esquecerTokenDaAba()
}

export function useAuth() {
  const token = useSyncExternalStore(inscrever, obterToken)
  const usuario = useMemo(() => (token ? decodificarUsuario(token) : null), [token])

  return { usuario, entrar: entrarComToken }
}
