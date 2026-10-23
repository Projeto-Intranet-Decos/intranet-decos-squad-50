import { api } from '../../lib/api'
import type { EdicaoUsuario, NovoUsuario, UsuarioCadastro, UsuarioCriado } from './types'

interface UsuarioApi {
  id: string
  nome: string
  email: string
  role: UsuarioCadastro['role']
  setor_id: string | null
  data_nascimento: string | null
  ativo: boolean
  criado_em: string
  convite_pendente: boolean
}

function paraUsuario(dados: UsuarioApi): UsuarioCadastro {
  return {
    id: dados.id, nome: dados.nome, email: dados.email, role: dados.role,
    setorId: dados.setor_id, dataNascimento: dados.data_nascimento,
    ativo: dados.ativo, criadoEm: dados.criado_em, convitePendente: dados.convite_pendente,
  }
}

export async function listarUsuarios(): Promise<UsuarioCadastro[]> {
  const { data } = await api.get<UsuarioApi[]>('/usuarios')
  return data.map(paraUsuario)
}

export async function criarUsuario(dados: NovoUsuario): Promise<UsuarioCriado> {
  const { data } = await api.post<UsuarioApi & { email_enviado: boolean }>('/usuarios', {
    nome: dados.nome, email: dados.email, role: dados.role,
    setor_id: dados.setorId, data_nascimento: dados.dataNascimento,
  })
  return { ...paraUsuario(data), emailEnviado: data.email_enviado }
}

/** Gera um convite novo para o usuário pendente; devolve se o e-mail saiu (USU-08). */
export async function reenviarConvite(id: string): Promise<boolean> {
  const { data } = await api.post<{ email_enviado: boolean }>(`/usuarios/${id}/convite`)
  return data.email_enviado
}

export async function editarUsuario(id: string, dados: EdicaoUsuario): Promise<UsuarioCadastro> {
  const { data } = await api.put<UsuarioApi>(`/usuarios/${id}`, {
    nome: dados.nome, email: dados.email, role: dados.role, ativo: dados.ativo,
    setor_id: dados.setorId, data_nascimento: dados.dataNascimento,
  })
  return paraUsuario(data)
}

export async function excluirUsuario(id: string): Promise<UsuarioCadastro> {
  const { data } = await api.delete<UsuarioApi>(`/usuarios/${id}`)
  return paraUsuario(data)
}
