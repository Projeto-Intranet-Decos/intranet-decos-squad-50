export type Papel = 'comum' | 'admin_setor' | 'superadmin'

export interface Usuario {
  id: string
  nome: string
  role: Papel
  setorId: string | null
}
