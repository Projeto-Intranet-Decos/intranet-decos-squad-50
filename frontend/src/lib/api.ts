import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { limparTokens, obterRefreshToken, obterToken, salvarAccessToken } from './auth/useAuth'

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

/** Troca o refresh token por um access token novo; pedidos simultâneos compartilham uma renovação. */
export function renovarAccessToken(): Promise<string> {
  if (!promessaRenovacao) {
    const refreshToken = obterRefreshToken()
    promessaRenovacao = (
      refreshToken
        ? api.post<{ access_token: string }>('/auth/refresh', { refresh_token: refreshToken })
        : Promise.reject(new Error('Sem refresh token'))
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
    if (!obterToken() && !obterRefreshToken()) return Promise.reject(erro)

    config._tentouRenovar = true
    try {
      const novoToken = await renovarAccessToken()
      config.headers.Authorization = `Bearer ${novoToken}`
      return api(config)
    } catch {
      limparTokens()
      window.location.href = '/login'
      return Promise.reject(erro)
    }
  },
)
