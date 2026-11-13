import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { limparTokens, obterToken, salvarAccessToken, temMarcadorDeSessao } from './auth/useAuth'

export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = obterToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

interface RequisicaoComRetentativa extends InternalAxiosRequestConfig {
  _tentouRenovar?: boolean
}

let promessaRenovacao: Promise<string> | null = null

/** Troca o refresh token (cookie HttpOnly, AUT-07) por um access token novo; pedidos simultâneos
 * compartilham uma renovação. */
export function renovarAccessToken(): Promise<string> {
  if (!promessaRenovacao) {
    promessaRenovacao = (
      temMarcadorDeSessao()
        ? api.post<{ access_token: string }>('/auth/refresh')
        : Promise.reject(new Error('Sem sessão'))
    )
      .then((resposta) => {
        salvarAccessToken(resposta.data.access_token)
        return resposta.data.access_token
      })
      .finally(() => {
        promessaRenovacao = null
      })
  }
  return promessaRenovacao
}

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro: AxiosError) => {
    const config = erro.config as RequisicaoComRetentativa | undefined
    const ehRotaDeAuth = config?.url === '/auth/login' || config?.url === '/auth/refresh'

    if (erro.response?.status !== 401 || !config || ehRotaDeAuth || config._tentouRenovar) {
      if (erro.response?.status === 401) limparTokens()
      return Promise.reject(erro)
    }

    // Visitante (sem sessão guardada) não tem o que renovar nem para onde ser expulso.
    if (!obterToken() && !temMarcadorDeSessao()) return Promise.reject(erro)

    config._tentouRenovar = true
    try {
      const novoToken = await renovarAccessToken()
      config.headers.Authorization = `Bearer ${novoToken}`
      return api(config)
    } catch {
      // Sessão acabou: recarrega a página atual já como visitante (AUT-10). Se a página for de
      // administração, a RotaProtegida leva ao login.
      limparTokens()
      window.location.reload()
      return Promise.reject(erro)
    }
  },
)
