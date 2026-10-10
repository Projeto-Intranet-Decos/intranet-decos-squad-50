import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import fachada from '../../shared/assets/fachada.png'
import logoDecos from '../../shared/assets/logo-decos.png'
import simboloDecos from '../../shared/assets/simbolo.png'
import { IconeOlho, IconeOlhoFechado } from '../../shared/components/icones'
import { api } from '../api'
import { useAuth } from './useAuth'

interface FormularioLogin {
  email: string
  senha: string
}

function PaginaLogin() {
  const [mostrarSenha, setMostrarSenha] = useState(false)
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
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <div className="bg-bordeaux-gradient relative flex min-h-dvh flex-col items-center justify-between overflow-hidden px-4 py-10 text-center sm:px-6 lg:px-[6vw] lg:py-14">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-32 -left-32 size-[28rem] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -right-24 -bottom-40 size-[30rem] rounded-full bg-black/20 blur-3xl" />
          <img
            src={simboloDecos}
            alt=""
            className="absolute top-1/2 -right-24 h-[70%] w-auto -translate-y-1/2 opacity-[0.07] brightness-0 invert"
          />
        </div>

        <div className="login-card relative my-auto flex w-full max-w-[440px] flex-col items-center rounded-2xl p-6 sm:p-8">
          <img src={logoDecos} alt="Hospital Decós" className="mb-8 h-12 w-auto" />

          <h1 className="mb-7 text-2xl font-semibold tracking-tight text-slate-900">
            Acesse a intranet
          </h1>

          <form
            onSubmit={handleSubmit((dados) => mutate(dados))}
            className="flex w-full flex-col gap-[18px] text-left"
          >
            <label className="flex flex-col gap-[7px]">
              <span className="text-xs font-medium tracking-wide text-slate-700 uppercase">
                E-MAIL
              </span>
              <input
                type="email"
                placeholder="nome.sobrenome@decos.com.br"
                className="field py-3 text-sm"
                {...register('email', { required: true })}
              />
            </label>

            <label className="flex flex-col gap-[7px]">
              <span className="text-xs font-medium tracking-wide text-slate-700 uppercase">
                SENHA
              </span>
              <div className="relative block">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="field py-3 pr-[50px] text-sm"
                  {...register('senha', { required: true })}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((prev) => !prev)}
                  title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-900/5 hover:text-slate-700"
                >
                  {mostrarSenha ? <IconeOlhoFechado /> : <IconeOlho />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary mt-3 min-h-12 w-full"
            >
              {isPending ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <span className="relative pt-10 text-xs text-white/80">
          Hospital Decós · Uso restrito a colaboradores
        </span>
      </div>

      <div className="relative hidden overflow-hidden bg-slate-800 lg:block">
        <img
          src={fachada}
          alt="Fachada do Hospital Decós"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(200deg, rgba(59,0,14,0.10) 0%, rgba(59,0,14,0.62) 100%)',
          }}
        />
      </div>
    </div>
  )
}

export default PaginaLogin
