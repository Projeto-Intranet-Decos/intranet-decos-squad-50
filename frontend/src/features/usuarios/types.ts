import type { Papel } from '../../lib/auth/tipos'

export interface UsuarioCadastro {
  id: string
  nome: string
  email: string
  role: Papel
  setorId: string | null
  dataNascimento: string | null
  ativo: boolean
  criadoEm: string
  convitePendente: boolean
}

export interface UsuarioCriado extends UsuarioCadastro {
  emailEnviado: boolean
}

export interface DadosUsuario {
  nome: string
  email: string
  role: Papel
  setorId: string | null
  dataNascimento: string | null
}

// Sem senha: o colaborador cria a dele pelo convite (USU-02).
export type NovoUsuario = DadosUsuario

export interface EdicaoUsuario extends DadosUsuario {
  ativo: boolean
}

export type OperacaoSalvarUsuario =
  | { tipo: 'criar'; dados: NovoUsuario }
  | { tipo: 'editar'; id: string; dados: EdicaoUsuario }

// Desativado vence pendente: desativar é o jeito de cancelar o convite (USU-04).
export type SituacaoUsuario = 'ativo' | 'pendente' | 'inativo'

export function situacaoDoUsuario(usuario: UsuarioCadastro): SituacaoUsuario {
  if (!usuario.ativo) return 'inativo'
  return usuario.convitePendente ? 'pendente' : 'ativo'
}

export const ROTULOS_SITUACAO: Record<SituacaoUsuario, string> = {
  ativo: 'Ativo', pendente: 'Convite pendente', inativo: 'Inativo',
}

export const ROTULOS_PAPEL: Record<Papel, string> = {
  comum: 'Colaborador', admin_setor: 'Administrador de setor', superadmin: 'Superadmin',
}

export type ColunaUsuario = 'nome' | 'perfil' | 'setor' | 'status'
