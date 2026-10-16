import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { criarUsuario, editarUsuario, excluirUsuario, listarUsuarios } from '../api'
import type { ErroUsuario, OperacaoSalvarUsuario } from '../types'

export function mensagemErroUsuario(erro: unknown): string {
  return isAxiosError<ErroUsuario>(erro) && typeof erro.response?.data?.mensagem === 'string'
    ? erro.response.data.mensagem : 'Não foi possível concluir a operação. Tente novamente.'
}

export function useUsuarios(usuarioId: string | undefined, permitido: boolean) {
  return useQuery({ queryKey: ['usuarios', usuarioId], queryFn: listarUsuarios, enabled: permitido })
}

export function useSalvarUsuario() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (operacao: OperacaoSalvarUsuario) => operacao.tipo === 'criar'
      ? criarUsuario(operacao.dados) : editarUsuario(operacao.id, operacao.dados),
    onSuccess: async (_usuario, operacao) => {
      await cliente.invalidateQueries({ queryKey: ['usuarios'] })
      await cliente.invalidateQueries({ queryKey: ['murais', 'aniversariantes'] })
      toast.success(operacao.tipo === 'criar' ? 'Usuário cadastrado.' : 'Usuário atualizado.')
    },
    onError: (erro: unknown) => toast.error(mensagemErroUsuario(erro)),
  })
}

export function useExcluirUsuario() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: excluirUsuario,
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['usuarios'] })
      await cliente.invalidateQueries({ queryKey: ['murais', 'aniversariantes'] })
      toast.success('Usuário desativado.')
    },
    onError: (erro: unknown) => toast.error(mensagemErroUsuario(erro)),
  })
}
