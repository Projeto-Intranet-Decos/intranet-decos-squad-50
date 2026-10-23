import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../api'
import CampoAcesso from './CampoAcesso'
import { BOTAO_ACESSO } from './estilos'
import LayoutAcesso from './LayoutAcesso'
import { useAuth } from './useAuth'

interface FormularioLogin {
  email: string
  senha: string
}

function PaginaLogin() {
  const { register, handleSubmit } = useForm<FormularioLogin>()
  const { entrar } = useAuth()
  const navegar = useNavigate()

  const { mutate, isPending } = useMutation({
    mutationFn: (dados: FormularioLogin) =>
      api.post<{ access_token: string; refresh_token: string }>('/auth/login', dados),
    onSuccess: (resposta) => {
      entrar(resposta.data.access_token, resposta.data.refresh_token)
      navegar('/mural')
    },
    onError: () => toast.error('E-mail ou senha inválidos.'),
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
