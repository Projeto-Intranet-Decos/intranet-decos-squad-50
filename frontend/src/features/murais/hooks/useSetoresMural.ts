import { useQuery } from '@tanstack/react-query'
import { listarSetores } from '../api'

/** Nome com sufixo "Mural" para não colidir com o futuro hook equivalente
 * de features/setores — aqui é só a lista mínima usada pelos seletores
 * de setor do mural (ver nota de tipo compartilhado em ../types.ts). */
export function useSetoresMural() {
  return useQuery({
    queryKey: ['murais', 'setores'],
    queryFn: listarSetores,
  })
}
