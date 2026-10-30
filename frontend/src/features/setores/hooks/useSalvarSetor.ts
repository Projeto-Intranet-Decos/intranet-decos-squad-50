import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import type { ErroCampo } from '../../../shared/types'
import { criarRamal, criarSetor, excluirRamal, renomearSetor } from '../api'
import type { SetorComRamais } from '../types'

interface VariaveisSalvarSetor {
  setorEditando: SetorComRamais | null
  nome: string
  numeros: string[]
}

async function salvarSetor({ setorEditando, nome, numeros }: VariaveisSalvarSetor): Promise<void> {
  const setorId = setorEditando ? setorEditando.id : (await criarSetor(nome)).id
  if (setorEditando && nome !== setorEditando.nome) {
    await renomearSetor(setorEditando.id, nome)
  }

  const existentes = setorEditando?.ramais ?? []
  const removidos = existentes.filter((ramal) => !numeros.includes(ramal.numero))
  const novos = numeros.filter((numero) => !existentes.some((ramal) => ramal.numero === numero))

  for (const ramal of removidos) {
    await excluirRamal(ramal.id)
  }
  for (const numero of novos) {
    await criarRamal(setorId, numero)
  }
}

export function useSalvarSetor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: salvarSetor,
    onSuccess: (_resultado, variaveis) => {
      toast.success(variaveis.setorEditando ? 'Setor atualizado com sucesso.' : 'Setor criado com sucesso.')
    },
    onError: (erro) => {
      const mensagem = isAxiosError<ErroCampo>(erro) ? erro.response?.data?.mensagem : undefined
      toast.error(mensagem ?? 'Erro ao salvar o setor. Tente novamente.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] })
    },
  })
}
