import { api } from '../api'

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

interface SessaoApi {
  access_token: string
  refresh_token: string
}

function paraSessao(dados: SessaoApi): SessaoNova {
  return { accessToken: dados.access_token, refreshToken: dados.refresh_token }
}

export async function entrarComSenha(dados: { email: string; senha: string }): Promise<SessaoNova> {
  const { data } = await api.post<SessaoApi>('/auth/login', dados)
  return paraSessao(data)
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
  const { data } = await api.post<SessaoApi>('/auth/convite/aceitar', {
    token: dados.token, nome: dados.nome, senha: dados.senha, data_nascimento: dados.dataNascimento,
  })
  return paraSessao(data)
}

// Troca e redefinição de senha (USU-07)

/** Devolve a mensagem neutra da API: a mesma, exista ou não a conta. */
export async function pedirRedefinicao(email: string): Promise<string> {
  const { data } = await api.post<{ mensagem: string }>('/auth/redefinicao-senha', { email })
  return data.mensagem
}

/** Devolve o e-mail da conta do link, sem gastar o token. */
export async function verificarRedefinicao(token: string): Promise<string> {
  const { data } = await api.post<{ email: string }>('/auth/redefinicao-senha/verificar', { token })
  return data.email
}

export async function confirmarRedefinicao(dados: { token: string; senha: string }): Promise<SessaoNova> {
  const { data } = await api.post<SessaoApi>('/auth/redefinicao-senha/confirmar', dados)
  return paraSessao(data)
}

/** Troca a senha de quem está logado; as outras sessões são encerradas e esta ganha tokens novos. */
export async function trocarSenha(dados: { senhaAtual: string; senhaNova: string }): Promise<SessaoNova> {
  const { data } = await api.put<SessaoApi>('/auth/senha', {
    senha_atual: dados.senhaAtual, senha_nova: dados.senhaNova,
  })
  return paraSessao(data)
}
