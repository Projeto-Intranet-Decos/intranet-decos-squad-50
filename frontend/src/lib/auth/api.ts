import { api } from '../api'

/** Erro da API no formato `{ campo?, mensagem }` (GER-05). */
export interface ErroApi {
  campo?: string
  mensagem: string
}

export interface DadosConvite {
  email: string
  nome: string
  dataNascimento: string | null
}

export interface AceiteConvite {
  token: string
  nome: string
  senha: string
  dataNascimento: string | null
}

export interface SessaoNova {
  accessToken: string
  refreshToken: string
}

// O token do magic link vai sempre no corpo, nunca na URL (AUT-08).

export async function verificarConvite(token: string): Promise<DadosConvite> {
  const { data } = await api.post<{ email: string; nome: string; data_nascimento: string | null }>(
    '/auth/convite/verificar',
    { token },
  )
  return { email: data.email, nome: data.nome, dataNascimento: data.data_nascimento }
}

export async function aceitarConvite(dados: AceiteConvite): Promise<SessaoNova> {
  const { data } = await api.post<{ access_token: string; refresh_token: string }>(
    '/auth/convite/aceitar',
    { token: dados.token, nome: dados.nome, senha: dados.senha, data_nascimento: dados.dataNascimento },
  )
  return { accessToken: data.access_token, refreshToken: data.refresh_token }
}
