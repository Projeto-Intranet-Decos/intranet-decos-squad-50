import type { Usuario } from './auth/tipos'


export function podeGerenciarConteudo(usuario: Usuario | null | undefined): boolean {
  return usuario?.role === 'admin_setor' || usuario?.role === 'superadmin'
}

export function podeDeletar(usuario: Usuario, recurso: { setorId: string }): boolean {
  if (usuario.role === 'superadmin') return true
  if (usuario.role === 'admin_setor') return usuario.setorId === recurso.setorId
  return false
}


export const podeEditar = podeDeletar

// Atalhos do acesso rápido são globais: só o superadmin mantém.
export function podeGerenciarAtalhos(usuario: Usuario | null | undefined): boolean {
  return usuario?.role === 'superadmin'
}
