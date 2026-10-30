import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { lerErroDaApi } from '../../shared/erros'
import { entrarComSenha } from './api'
import CampoAcesso from './CampoAcesso'
import { BOTAO_ACESSO } from './estilos'
import LayoutAcesso from './LayoutAcesso'
import { useAuth } from './useAuth'

const MENSAGEM_NEUTRA = 'E-mail ou senha inválidos.'

interface FormularioLogin {
  email: string
  senha: string
}

function PaginaLogin() {
  const { register, handleSubmit } = useForm<FormularioLogin>()
  const { entrar } = useAuth()
  const navegar = useNavigate()
  // Volta para a página que a pessoa estava vendo (modo visitante, AUT-10).
  const origem = (useLocation().state as { de?: string } | null)?.de

  const { mutate, isPending } = useMutation({
    mutationFn: entrarComSenha,
    onSuccess: (sessao) => {
      entrar(sessao.accessToken)
      navegar(origem ?? '/mural')
    },
    onError: (erro: unknown) => {
      // 429 (AUT-11) explica o bloqueio; o resto fica na mensagem neutra, que não diz o que falhou.
      const bloqueado = isAxiosError(erro) && erro.response?.status === 429
      toast.error(
        bloqueado ? lerErroDaApi(erro, MENSAGEM_NEUTRA).mensagem : MENSAGEM_NEUTRA,
      )
    },
  })

  return (
    <LayoutAcesso titulo="Acesse a intranet">
      <form
        onSubmit={handleSubmit((dados) => mutate(dados))}
        className="flex w-full flex-col gap-[18px] text-left"
      >
        <CampoAcesso
          rotulo="E-mail"
          type="email"
          placeholder="nome.sobrenome@decos.com.br"
          {...register('email', { required: true })}
        />

        <CampoAcesso
          rotulo="Senha"
          type="password"
          placeholder="••••••••"
          {...register('senha', { required: true })}
        />

        <button
          type="submit"
          disabled={isPending}
          className={`mt-[12px] ${BOTAO_ACESSO}`}
        >
          {isPending ? 'Entrando...' : 'Entrar'}
        </button>

        <Link to="/esqueci-senha" className="self-center text-sm font-medium text-brand-700 hover:underline">
          Esqueci minha senha
        </Link>
      </form>
    </LayoutAcesso>
  )
}

export default PaginaLogin
