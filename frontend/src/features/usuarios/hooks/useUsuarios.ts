import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { criarUsuario, editarUsuario, excluirUsuario, listarUsuarios, reenviarConvite } from '../api'
import type { ErroUsuario, OperacaoSalvarUsuario, UsuarioCadastro } from '../types'

export function mensagemErroUsuario(erro: unknown): string {
  return isAxiosError<ErroUsuario>(erro) && typeof erro.response?.data?.mensagem === 'string'
    ? erro.response.data.mensagem : 'Não foi possível concluir a operação. Tente novamente.'
}

export function useUsuarios(usuarioId: string | undefined, permitido: boolean) {
  return useQuery({ queryKey: ['usuarios', usuarioId], queryFn: listarUsuarios, enabled: permitido })
}

export function useSalvarUsuario() {
  const cliente = useQueryClient()
  const reenviar = useReenviarConvite()
  return useMutation({
    mutationFn: (operacao: OperacaoSalvarUsuario) => operacao.tipo === 'criar'
      ? criarUsuario(operacao.dados) : editarUsuario(operacao.id, operacao.dados),
    onSuccess: async (usuario, operacao) => {
      await cliente.invalidateQueries({ queryKey: ['usuarios'] })
      await cliente.invalidateQueries({ queryKey: ['murais', 'aniversariantes'] })
      if (operacao.tipo === 'editar') toast.success('Usuário atualizado.')
      else if ('emailEnviado' in usuario && usuario.emailEnviado) toast.success(`Convite enviado para ${usuario.email}.`)
      else toast.warning('Usuário cadastrado, mas o convite não foi enviado.', {
        action: { label: 'Reenviar convite', onClick: () => reenviar.mutate(usuario) },
      })
    },
    onError: (erro: unknown) => toast.error(mensagemErroUsuario(erro)),
  })
}

export function useReenviarConvite() {
  return useMutation({
    mutationFn: (usuario: Pick<UsuarioCadastro, 'id' | 'email'>) => reenviarConvite(usuario.id),
    onSuccess: (enviado, usuario) => enviado
      ? toast.success(`Convite reenviado para ${usuario.email}.`)
      : toast.warning('O convite não foi enviado. Tente novamente em instantes.'),
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
