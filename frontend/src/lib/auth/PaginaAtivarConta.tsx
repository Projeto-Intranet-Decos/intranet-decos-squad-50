import { useMutation, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { aceitarConvite, verificarConvite, type AceiteConvite, type DadosConvite, type ErroApi } from './api'
import CampoAcesso from './CampoAcesso'
import LayoutAcesso from './LayoutAcesso'
import { limparTokens, useAuth } from './useAuth'

const TITULO = 'Ative sua conta'

function lerToken(hash: string) {
  return new URLSearchParams(hash.replace(/^#/, '')).get('token') ?? ''
}

function ehLinkInvalido(erro: unknown) {
  return isAxiosError(erro) && erro.response?.status === 400
}

/** Página do convite (AUT-09), aberta pelo magic link do e-mail (AUT-08). Pública. */
function PaginaAtivarConta() {
  const local = useLocation()
  const navegar = useNavigate()
  // Lido uma vez só: logo em seguida o token sai da barra de endereço.
  const [token] = useState(() => lerToken(local.hash))
  const [linkRecusado, setLinkRecusado] = useState(false)

  useEffect(() => {
    if (local.hash) navegar({ pathname: local.pathname, search: local.search }, { replace: true })
  }, [local.hash, local.pathname, local.search, navegar])

  const convite = useQuery({
    queryKey: ['convite', token],
    queryFn: () => verificarConvite(token),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  })

  if (!token || linkRecusado || ehLinkInvalido(convite.error)) {
    return (
      <LayoutAcesso titulo={TITULO}>
        <div className="flex w-full flex-col gap-5 text-sm text-slate-600">
          <p role="alert">Link inválido ou expirado. Peça um novo convite ao administrador.</p>
          <Link to="/login" className="btn btn-primary min-h-12 w-full">Ir para o login</Link>
        </div>
      </LayoutAcesso>
    )
  }

  if (convite.isError) {
    return (
      <LayoutAcesso titulo={TITULO}>
        <div className="flex w-full flex-col gap-5 text-sm text-slate-600">
          <p role="alert">Não foi possível verificar o convite agora.</p>
          <button type="button" onClick={() => void convite.refetch()} className="btn btn-primary min-h-12 w-full">
            Tentar novamente
          </button>
        </div>
      </LayoutAcesso>
    )
  }

  return (
    <LayoutAcesso titulo={TITULO}>
      {convite.isPending
        ? <p role="status" className="text-sm text-slate-600">Verificando o convite…</p>
        : <FormularioAtivacao token={token} convite={convite.data} aoRecusarLink={() => setLinkRecusado(true)} />}
    </LayoutAcesso>
  )
}

interface ValoresAtivacao {
  nome: string
  dataNascimento: string
  senha: string
  confirmacao: string
}

interface PropriedadesFormulario {
  token: string
  convite: DadosConvite
  aoRecusarLink: () => void
}

const CAMPOS_DA_API: Record<string, keyof ValoresAtivacao> = {
  nome: 'nome', data_nascimento: 'dataNascimento', senha: 'senha',
}

function FormularioAtivacao({ token, convite, aoRecusarLink }: PropriedadesFormulario) {
  const { entrar } = useAuth()
  const navegar = useNavigate()
  const { register, handleSubmit, getValues, setError, formState: { errors } } = useForm<ValoresAtivacao>({
    defaultValues: { nome: convite.nome, dataNascimento: convite.dataNascimento ?? '', senha: '', confirmacao: '' },
  })

  const aceitar = useMutation({
    mutationFn: (dados: AceiteConvite) => aceitarConvite(dados),
    onSuccess: (sessao) => {
      // Computador compartilhado: a sessão de quem estava logado sai antes de a nova entrar.
      limparTokens()
      entrar(sessao.accessToken, sessao.refreshToken)
      navegar('/mural', { replace: true })
    },
    onError: (erro: unknown) => {
      if (ehLinkInvalido(erro)) return aoRecusarLink()
      const dados = isAxiosError<ErroApi>(erro) ? erro.response?.data : undefined
      const mensagem = typeof dados?.mensagem === 'string' ? dados.mensagem : 'Não foi possível ativar a conta. Tente novamente.'
      const campo = dados?.campo && CAMPOS_DA_API[dados.campo]
      if (campo) setError(campo, { message: mensagem })
      toast.error(mensagem)
    },
  })

  function enviar(valores: ValoresAtivacao) {
    aceitar.mutate({
      token, nome: valores.nome.trim(), senha: valores.senha, dataNascimento: valores.dataNascimento || null,
    })
  }

  return (
    <form onSubmit={handleSubmit(enviar)} className="flex w-full flex-col gap-[18px] text-left">
      <p className="text-sm text-slate-600">Crie sua senha e confira seus dados para entrar na intranet.</p>
      <fieldset disabled={aceitar.isPending} className="flex flex-col gap-[18px]">
        <CampoAcesso rotulo="E-mail" type="email" autoComplete="username" value={convite.email} readOnly />
        <CampoAcesso
          rotulo="Nome completo"
          autoComplete="name"
          maxLength={200}
          erro={errors.nome?.message}
          {...register('nome', { validate: valor => !!valor.trim() || 'Informe o nome.' })}
        />
        <CampoAcesso
          rotulo="Data de nascimento"
          type="date"
          erro={errors.dataNascimento?.message}
          {...register('dataNascimento')}
        />
        <CampoAcesso
          rotulo="Senha"
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
          {aceitar.isPending ? 'Ativando…' : 'Ativar conta'}
        </button>
      </fieldset>
    </form>
  )
}

export default PaginaAtivarConta
