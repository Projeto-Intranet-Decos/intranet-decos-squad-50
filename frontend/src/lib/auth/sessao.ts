import { api, renovarAccessToken } from '../api'
import {
  CHAVE_MARCADOR_SESSAO,
  CHAVES_ANTIGAS,
  esquecerTokenDaAba,
  limparTokens,
  temMarcadorDeSessao,
} from './useAuth'

let sincronizandoAbas = false

// AUT-04: as abas combinam pelo marcador. Saiu numa, sai em todas; entrou numa, as outras renovam
// pelo cookie (que é do navegador, não da aba).
function sincronizarComOutrasAbas() {
  if (sincronizandoAbas) return
  sincronizandoAbas = true
  window.addEventListener('storage', (evento) => {
    if (evento.key !== CHAVE_MARCADOR_SESSAO) return
    if (evento.newValue === null) esquecerTokenDaAba()
    else renovarAccessToken().catch(() => esquecerTokenDaAba())
  })
}

/** Roda antes do primeiro render (main.tsx): a tela já abre logada ou como visitante. */
export async function iniciarSessao() {
  try {
    CHAVES_ANTIGAS.forEach((chave) => localStorage.removeItem(chave))
  } catch {
    // Sem localStorage não há chave antiga para apagar.
  }
  sincronizarComOutrasAbas()
  // Sem marcador é visitante: não há cookie que valha a pena tentar (AUT-10).
  if (!temMarcadorDeSessao()) return
  try {
    await renovarAccessToken()
  } catch {
    limparTokens()
  }
}

/** AUT-06: esquece a sessão na hora e revoga o refresh token no backend. O logout só precisa do
 * cookie, então pode ir depois de a aba já ter voltado a visitante. */
export async function sairDaConta() {
  limparTokens()
  try {
    await api.post('/auth/logout')
  } catch {
    // Falhou a revogação: o cookie ainda expira sozinho, e a aba já não está logada.
  }
}
