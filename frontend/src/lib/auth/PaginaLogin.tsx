import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../api'
import CampoAcesso from './CampoAcesso'
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
          className="mt-[12px] w-full rounded-lg bg-[#800020] py-[14px] text-center text-sm font-medium text-white transition-colors hover:bg-[#3b000e] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </LayoutAcesso>
  )
}

export default PaginaLogin
