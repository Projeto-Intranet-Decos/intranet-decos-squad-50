import { useQuery } from '@tanstack/react-query'
import { listarSetores } from '../api'

// Só o superadmin escolhe setor no formulário; para os outros a lista nem é buscada.
export function useSetoresDuvidas(habilitado: boolean) {
  return useQuery({
    queryKey: ['setores-duvidas'],
    queryFn: listarSetores,
    enabled: habilitado,
  })
}
