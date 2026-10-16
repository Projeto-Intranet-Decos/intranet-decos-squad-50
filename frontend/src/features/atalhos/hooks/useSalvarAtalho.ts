import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { atualizarAtalho, criarAtalho } from '../api'
import type { DadosAtalho } from '../types'

interface VariaveisSalvarAtalho {
  id: string | null
  dados: DadosAtalho
}

// O erro fica a cargo de quem chama: precisa do setError do formulário inline (GER-05).
export function useSalvarAtalho() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dados }: VariaveisSalvarAtalho) => (id ? atualizarAtalho(id, dados) : criarAtalho(dados)),
    onSuccess: (_atalho, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['atalhos'] })
      toast.success(id ? 'Atalho atualizado.' : 'Atalho criado.')
    },
  })
}
