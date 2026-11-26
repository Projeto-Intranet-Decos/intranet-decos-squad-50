import type { Papel, Usuario } from './auth/tipos'

type UsuarioOuNada = Usuario | null | undefined

// Rotas e seções de Administração (USU-09): Usuários é do superadmin e do RH; o Registro de atividades,
// só do superadmin.
export const PAPEIS_USUARIOS: Papel[] = ['superadmin', 'rh']
export const PAPEIS_LOGS: Papel[] = ['superadmin']

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

// Marketing também escolhe o setor, mas só nos avisos (os demais módulos não o deixam escrever).
export function canEscolherSetor(usuario: UsuarioOuNada): boolean {
  return isSuperadmin(usuario) || usuario?.role === 'marketing'
}

export function canPublicarAviso(usuario: UsuarioOuNada): boolean {
  return canGerenciarConteudo(usuario) || usuario?.role === 'marketing'
}

// Marketing só mexe nos avisos que criou; os outros papéis seguem o escopo por setor (GER-04).
export function canEditarAviso(usuario: UsuarioOuNada, aviso: { setorId: string; autorId: string }): boolean {
  if (usuario?.role === 'marketing') return aviso.autorId === usuario.id
  return canGerenciarSetor(usuario, aviso.setorId)
}

export function setoresParaPublicar<T extends { id: string }>(usuario: UsuarioOuNada, setores: T[]): T[] {
  return canEscolherSetor(usuario) ? setores : setores.filter((setor) => setor.id === usuario?.setorId)
}

export function canAdministrarSetores(usuario: UsuarioOuNada): boolean {
  return isSuperadmin(usuario)
}

export function canGerenciarUsuarios(usuario: UsuarioOuNada): boolean {
  return !!usuario && PAPEIS_USUARIOS.includes(usuario.role)
}

export function canVerLogs(usuario: UsuarioOuNada): boolean {
  return !!usuario && PAPEIS_LOGS.includes(usuario.role)
}

export function canAcessarAdministracao(usuario: UsuarioOuNada): boolean {
  return canGerenciarUsuarios(usuario) || canVerLogs(usuario)
}

// O RH nunca atribui nem altera superadmin (USU-09).
export function papeisAtribuiveis(usuario: UsuarioOuNada): Papel[] {
  const todos: Papel[] = ['comum', 'admin_setor', 'rh', 'marketing']
  return isSuperadmin(usuario) ? [...todos, 'superadmin'] : todos
}

export function canAlterarUsuario(usuario: UsuarioOuNada, alvo: { role: Papel }): boolean {
  return canGerenciarUsuarios(usuario) && (isSuperadmin(usuario) || alvo.role !== 'superadmin')
}

// O visitante (sem login) só vê: baixar e abrir arquivos exige sessão, como no backend (AUT-10).
export function canBaixarArquivos(usuario: UsuarioOuNada): boolean {
  return !!usuario
}

// Atalhos do acesso rápido são globais: só o superadmin mantém.
export function canGerenciarAtalhos(usuario: UsuarioOuNada): boolean {
  return isSuperadmin(usuario)
}
