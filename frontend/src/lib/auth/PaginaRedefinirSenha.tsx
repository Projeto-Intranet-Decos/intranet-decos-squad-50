import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { confirmarRedefinicao, verificarRedefinicao } from './api'
import AvisoDoLink from './AvisoDoLink'
import CampoAcesso from './CampoAcesso'
import { lerErroDaApi } from './erros'
import LayoutAcesso from './LayoutAcesso'
import { limparTokens, useAuth } from './useAuth'
import { ehLinkRecusado, useTokenDoLink } from './useTokenDoLink'

const TITULO = 'Crie uma senha nova'

/** Página da redefinição de senha (USU-07), aberta pelo magic link do e-mail (AUT-08). Pública. */
function PaginaRedefinirSenha() {
  const token = useTokenDoLink()
  const [linkRecusado, setLinkRecusado] = useState(false)

  const verificacao = useQuery({
    queryKey: ['redefinicao-senha', token],
    queryFn: () => verificarRedefinicao(token),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  })

  if (!token || linkRecusado || ehLinkRecusado(verificacao.error)) {
    return (
      <LayoutAcesso titulo={TITULO}>
        <AvisoDoLink mensagem="Link inválido ou expirado. Peça um novo link para redefinir a senha.">
          <Link to="/esqueci-senha" className="btn btn-primary min-h-12 w-full">Pedir um novo link</Link>
        </AvisoDoLink>
      </LayoutAcesso>
    )
  }

  if (verificacao.isError) {
    return (
      <LayoutAcesso titulo={TITULO}>
        <AvisoDoLink mensagem="Não foi possível verificar o link agora.">
          <button type="button" onClick={() => void verificacao.refetch()} className="btn btn-primary min-h-12 w-full">
            Tentar novamente
          </button>
        </AvisoDoLink>
      </LayoutAcesso>
    )
  }

  return (
    <LayoutAcesso titulo={TITULO}>
      {verificacao.isPending
        ? <p role="status" className="text-sm text-slate-600">Verificando o link…</p>
        : <FormularioNovaSenha token={token} email={verificacao.data} aoRecusarLink={() => setLinkRecusado(true)} />}
    </LayoutAcesso>
  )
}

interface ValoresNovaSenha {
  senha: string
  confirmacao: string
}

interface PropriedadesFormulario {
  token: string
  email: string
  aoRecusarLink: () => void
}

function FormularioNovaSenha({ token, email, aoRecusarLink }: PropriedadesFormulario) {
  const { entrar } = useAuth()
  const navegar = useNavigate()
  const { register, handleSubmit, getValues, setError, formState: { errors } } = useForm<ValoresNovaSenha>({
    defaultValues: { senha: '', confirmacao: '' },
  })

  const confirmar = useMutation({
    mutationFn: (dados: { token: string; senha: string }) => confirmarRedefinicao(dados),
    onSuccess: (sessao) => {
      // Computador compartilhado: a sessão de quem estava logado sai antes de a nova entrar.
      limparTokens()
      entrar(sessao.accessToken, sessao.refreshToken)
      navegar('/mural', { replace: true })
    },
    onError: (erro: unknown) => {
      if (ehLinkRecusado(erro)) return aoRecusarLink()
      const { campo, mensagem } = lerErroDaApi(erro, 'Não foi possível salvar a senha. Tente novamente.')
      if (campo === 'senha') setError('senha', { message: mensagem })
      toast.error(mensagem)
    },
  })

  return (
    <form
      onSubmit={handleSubmit(({ senha }) => confirmar.mutate({ token, senha }))}
      className="flex w-full flex-col gap-[18px] text-left"
    >
      <p className="text-sm text-slate-600">Escolha a senha nova. As sessões abertas em outros computadores serão encerradas.</p>
      <fieldset disabled={confirmar.isPending} className="flex flex-col gap-[18px]">
        <CampoAcesso rotulo="E-mail" type="email" autoComplete="username" value={email} readOnly />
        <CampoAcesso
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          maxLength={128}
          erro={errors.senha?.message}
          {...register('senha', {
            required: 'Crie uma senha.',
            minLength: { value: 8, message: 'Use pelo menos 8 caracteres.' },
          })}
        />
        <CampoAcesso
          rotulo="Confirme a senha"
          type="password"
          autoComplete="new-password"
          maxLength={128}
          erro={errors.confirmacao?.message}
          {...register('confirmacao', {
            validate: valor => valor === getValues('senha') || 'As senhas não conferem.',
          })}
        />
        <button type="submit" className="btn btn-primary mt-3 min-h-12 w-full">
          {confirmar.isPending ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </fieldset>
    </form>
  )
}

export default PaginaRedefinirSenha
