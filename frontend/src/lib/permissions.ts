import type { Papel, Usuario } from './auth/tipos'

type UsuarioOuNada = Usuario | null | undefined

export const PAPEIS_ADMINISTRACAO: Papel[] = ['superadmin']

function isSuperadmin(usuario: UsuarioOuNada): boolean {
  return usuario?.role === 'superadmin'
}

export function canGerenciarConteudo(usuario: UsuarioOuNada): boolean {
  return usuario?.role === 'admin_setor' || isSuperadmin(usuario)
}

export function canGerenciarSetor(usuario: UsuarioOuNada, setorId: string): boolean {
  if (isSuperadmin(usuario)) return true
  return usuario?.role === 'admin_setor' && usuario.setorId === setorId
}

export function canEditar(usuario: UsuarioOuNada, recurso: { setorId: string }): boolean {
  return canGerenciarSetor(usuario, recurso.setorId)
}

export const canDeletar = canEditar

export function canEscolherSetor(usuario: UsuarioOuNada): boolean {
  return isSuperadmin(usuario)
}

export function setoresParaPublicar<T extends { id: string }>(usuario: UsuarioOuNada, setores: T[]): T[] {
  return canEscolherSetor(usuario) ? setores : setores.filter((setor) => setor.id === usuario?.setorId)
}

export function canAdministrarSetores(usuario: UsuarioOuNada): boolean {
  return isSuperadmin(usuario)
}

export function canAcessarAdministracao(usuario: UsuarioOuNada): boolean {
  return !!usuario && PAPEIS_ADMINISTRACAO.includes(usuario.role)
}

// Atalhos do acesso rápido são globais: só o superadmin mantém.
export function canGerenciarAtalhos(usuario: UsuarioOuNada): boolean {
  return isSuperadmin(usuario)
}
