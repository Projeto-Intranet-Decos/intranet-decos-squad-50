export interface Ramal {
  id: string
  numero: string
  setorId: string
}

export interface SetorComRamais {
  id: string
  nome: string
  criadoEm: string
  ramais: Ramal[]
}

export type OrdemSetores = 'nome' | 'ramal'
