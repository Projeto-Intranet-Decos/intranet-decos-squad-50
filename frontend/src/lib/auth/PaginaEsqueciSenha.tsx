import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { pedirRedefinicao } from './api'
import CampoAcesso from './CampoAcesso'
import { lerErroDaApi } from './erros'
import { BOTAO_ACESSO } from './estilos'
import LayoutAcesso from './LayoutAcesso'

const CLASSE_LINK_LOGIN = 'self-center text-sm font-medium text-brand-700 hover:underline'

/** Pedido de redefinição de senha (USU-07). Pública; a resposta é a mesma, exista ou não a conta. */
function PaginaEsqueciSenha() {
  const { register, handleSubmit, setError, formState: { errors } } = useForm<{ email: string }>()

  const pedir = useMutation({
    mutationFn: (email: string) => pedirRedefinicao(email),
    onError: (erro: unknown) => {
      const { campo, mensagem } = lerErroDaApi(erro, 'Não foi possível enviar o pedido. Tente novamente.')
      if (campo === 'email') setError('email', { message: mensagem })
      toast.error(mensagem)
    },
  })

  return (
    <LayoutAcesso titulo="Esqueci minha senha">
      {pedir.isSuccess ? (
        <div className="flex w-full flex-col gap-5 text-sm text-slate-600">
          <p role="status">{pedir.data}</p>
          <Link to="/login" className={BOTAO_ACESSO}>Voltar para o login</Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(({ email }) => pedir.mutate(email.trim()))}
          className="flex w-full flex-col gap-[18px] text-left"
        >
          <p className="text-sm text-slate-600">
            Informe o e-mail da sua conta. Se ele estiver cadastrado, enviaremos um link para criar
            uma senha nova.
          </p>
          <fieldset disabled={pedir.isPending} className="flex flex-col gap-[18px]">
            <CampoAcesso
              rotulo="E-mail"
              type="email"
              autoComplete="email"
              placeholder="nome.sobrenome@decos.com.br"
              erro={errors.email?.message}
              {...register('email', { required: 'Informe o e-mail.' })}
            />
            <button type="submit" className={`mt-[12px] ${BOTAO_ACESSO}`}>
              {pedir.isPending ? 'Enviando…' : 'Enviar link'}
            </button>
          </fieldset>
          <Link to="/login" className={CLASSE_LINK_LOGIN}>Voltar para o login</Link>
        </form>
      )}
    </LayoutAcesso>
  )
}

export default PaginaEsqueciSenha
