import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import Botao from '../../shared/components/Botao'
import Campo from '../../shared/components/Campo'
import Input from '../../shared/components/Input'
import Modal from '../../shared/components/Modal'
import { trocarSenha } from './api'
import { lerErroDaApi } from '../../shared/erros'
import { useAuth } from './useAuth'

interface ValoresTroca {
  senhaAtual: string
  senhaNova: string
  confirmacao: string
}

const CAMPOS_DA_API: Record<string, keyof ValoresTroca> = { senha_atual: 'senhaAtual', senha_nova: 'senhaNova' }

/** Troca de senha de quem está logado (USU-07). */
function ModalAlterarSenha({ aoFechar }: { aoFechar: () => void }) {
  const { entrar } = useAuth()
  const { register, handleSubmit, getValues, setError, formState: { errors } } = useForm<ValoresTroca>({
    defaultValues: { senhaAtual: '', senhaNova: '', confirmacao: '' },
  })

  const trocar = useMutation({
    mutationFn: (dados: { senhaAtual: string; senhaNova: string }) => trocarSenha(dados),
    onSuccess: (sessao) => {
      // A API encerrou todas as sessões, inclusive esta: segue com os tokens novos.
      entrar(sessao.accessToken, sessao.refreshToken)
      toast.success('Senha alterada. As outras sessões foram encerradas.')
      aoFechar()
    },
    onError: (erro: unknown) => {
      const { campo: campoDaApi, mensagem } = lerErroDaApi(erro, 'Não foi possível alterar a senha. Tente novamente.')
      const campo = campoDaApi && CAMPOS_DA_API[campoDaApi]
      if (campo) setError(campo, { message: mensagem })
      toast.error(mensagem)
    },
  })

  function fechar() { if (!trocar.isPending) aoFechar() }

  return (
    <Modal aberto titulo="Alterar senha" aoFechar={fechar} largura="440px">
      <form onSubmit={handleSubmit(({ senhaAtual, senhaNova }) => trocar.mutate({ senhaAtual, senhaNova }))}>
        <fieldset disabled={trocar.isPending} className="flex flex-col gap-4">
          <Campo rotulo="Senha atual" erro={errors.senhaAtual?.message}>
            <Input type="password" autoComplete="current-password" maxLength={128} {...register('senhaAtual', { required: 'Informe a senha atual.' })} />
          </Campo>
          <Campo rotulo="Nova senha" erro={errors.senhaNova?.message}>
            <Input type="password" autoComplete="new-password" maxLength={128} {...register('senhaNova', { required: 'Crie uma senha.', minLength: { value: 8, message: 'Use pelo menos 8 caracteres.' } })} />
          </Campo>
          <Campo rotulo="Confirme a nova senha" erro={errors.confirmacao?.message}>
            <Input type="password" autoComplete="new-password" maxLength={128} {...register('confirmacao', { validate: valor => valor === getValues('senhaNova') || 'As senhas não conferem.' })} />
          </Campo>
          <p className="text-sm text-slate-500">As sessões abertas em outros computadores serão encerradas.</p>
          <div className="flex justify-end gap-2 border-t border-brand-100/60 pt-4">
            <Botao onClick={fechar}>Cancelar</Botao>
            <Botao type="submit" variante="primario">{trocar.isPending ? 'Salvando…' : 'Alterar senha'}</Botao>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}

export default ModalAlterarSenha
