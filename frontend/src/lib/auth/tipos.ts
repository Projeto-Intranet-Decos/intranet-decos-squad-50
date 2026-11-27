export type Papel = 'comum' | 'admin_setor' | 'superadmin' | 'rh' | 'marketing'

export interface Usuario {
  id: string
  nome: string
  role: Papel
  setorId: string | null
}
