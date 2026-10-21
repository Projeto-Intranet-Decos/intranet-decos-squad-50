import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { aceitarConvite, verificarConvite, type AceiteConvite, type DadosConvite } from './api'
import AvisoDoLink from './AvisoDoLink'
import CampoAcesso from './CampoAcesso'
import { lerErroDaApi } from './erros'
import LayoutAcesso from './LayoutAcesso'
import { limparTokens, useAuth } from './useAuth'
import { ehLinkRecusado, useTokenDoLink } from './useTokenDoLink'

const TITULO = 'Ative sua conta'

/** Página do convite (AUT-09), aberta pelo magic link do e-mail (AUT-08). Pública. */
function PaginaAtivarConta() {
  const token = useTokenDoLink()
  const [linkRecusado, setLinkRecusado] = useState(false)

  const convite = useQuery({
    queryKey: ['convite', token],
    queryFn: () => verificarConvite(token),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  })

  if (!token || linkRecusado || ehLinkRecusado(convite.error)) {
    return (
      <LayoutAcesso titulo={TITULO}>
        <AvisoDoLink mensagem="Link inválido ou expirado. Peça um novo convite ao administrador.">
          <Link to="/login" className="btn btn-primary min-h-12 w-full">Ir para o login</Link>
        </AvisoDoLink>
      </LayoutAcesso>
    )
  }

  if (convite.isError) {
    return (
      <LayoutAcesso titulo={TITULO}>
        <AvisoDoLink mensagem="Não foi possível verificar o convite agora.">
          <button type="button" onClick={() => void convite.refetch()} className="btn btn-primary min-h-12 w-full">
            Tentar novamente
          </button>
        </AvisoDoLink>
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
      if (ehLinkRecusado(erro)) return aoRecusarLink()
      const { campo: campoDaApi, mensagem } = lerErroDaApi(erro, 'Não foi possível ativar a conta. Tente novamente.')
      const campo = campoDaApi && CAMPOS_DA_API[campoDaApi]
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
