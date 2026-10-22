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
}

export interface DadosUsuario {
  nome: string
  email: string
  role: Papel
  setorId: string | null
  dataNascimento: string | null
}

export interface NovoUsuario extends DadosUsuario {
  senha: string
}

export interface EdicaoUsuario extends DadosUsuario {
  ativo: boolean
}

export type OperacaoSalvarUsuario =
  | { tipo: 'criar'; dados: NovoUsuario }
  | { tipo: 'editar'; id: string; dados: EdicaoUsuario }

export interface ErroUsuario {
  campo?: string
  mensagem: string
}

export const ROTULOS_PAPEL: Record<Papel, string> = {
  comum: 'Colaborador', admin_setor: 'Administrador de setor', superadmin: 'Superadmin',
}

export type ColunaUsuario = 'nome' | 'perfil' | 'setor' | 'status'
