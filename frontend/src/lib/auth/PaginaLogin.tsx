import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import fachada from '../../shared/assets/fachada.png'
import logoDecos from '../../shared/assets/logo-decos.png'
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
    <div className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-2">
      <div className="flex min-h-screen flex-col items-center justify-between px-6 py-12 text-center lg:px-[8vw] lg:py-14">
        <div className="my-auto flex w-full max-w-[400px] flex-col items-center">
          <img
            src={logoDecos}
            alt="Hospital Decós"
            className="mb-11 h-11 w-[168px] object-contain"
          />

          <h1 className="mb-[34px] text-[30px] font-bold tracking-[-0.025em] text-slate-800">
            Acesse a intranet
          </h1>

          <form
            onSubmit={handleSubmit((dados) => mutate(dados))}
            className="flex w-full flex-col gap-[18px] text-left"
          >
            <label className="flex flex-col gap-[7px]">
              <span className="text-[11px] font-medium tracking-[0.07em] text-slate-500 uppercase">
                E-MAIL
              </span>
              <input
                type="email"
                placeholder="nome.sobrenome@decos.com.br"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-[14px] py-[13px] text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#800020]"
                {...register('email', { required: true })}
              />
            </label>

            <label className="flex flex-col gap-[7px]">
              <span className="text-[11px] font-medium tracking-[0.07em] text-slate-500 uppercase">
                SENHA
              </span>
              <div className="relative block">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-[13px] pr-[46px] pl-[14px] text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#800020]"
                  {...register('senha', { required: true })}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((prev) => !prev)}
                  title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-[6px] top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  {mostrarSenha ? <IconeOlhoFechado /> : <IconeOlho />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={isPending}
              className="mt-[12px] w-full rounded-lg bg-[#800020] py-[14px] text-center text-sm font-medium text-white transition-colors hover:bg-[#3b000e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <span className="pt-12 text-[11.5px] text-slate-400">
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
