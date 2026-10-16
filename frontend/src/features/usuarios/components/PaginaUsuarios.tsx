import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { IconeMais } from '../../../shared/components/icones'
import { useAuth } from '../../../lib/auth/useAuth'
import Botao from '../../../shared/components/Botao'
import Campo from '../../../shared/components/Campo'
import Input from '../../../shared/components/Input'
import Modal from '../../../shared/components/Modal'
import Select from '../../../shared/components/Select'
import { listarSetores } from '../../setores/api'
import { mensagemErroUsuario, useExcluirUsuario, useUsuarios } from '../hooks/useUsuarios'
import { ROTULOS_PAPEL, type UsuarioCadastro } from '../types'
import ModalUsuario from './ModalUsuario'
import TabelaUsuarios from './TabelaUsuarios'

const TAMANHO_PAGINA = 10

export default function PaginaUsuarios() {
  const { usuario } = useAuth()
  const permitido = usuario?.role === 'superadmin'
  const consulta = useUsuarios(usuario?.id, permitido)
  const setores = useQuery({ queryKey: ['setores-usuarios'], queryFn: listarSetores, enabled: permitido })
  const excluir = useExcluirUsuario()
  const [busca, setBusca] = useState('')
  const [papel, setPapel] = useState('')
  const [setorId, setSetorId] = useState('')
  const [status, setStatus] = useState('')
  const [pagina, setPagina] = useState(1)
  const [edicao, setEdicao] = useState<UsuarioCadastro | 'novo' | null>(null)
  const [exclusao, setExclusao] = useState<UsuarioCadastro | null>(null)

  if (!usuario) return <Navigate to="/login" replace />
  if (!permitido) return <Navigate to="/nao-autorizado" replace />

  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const filtrados = (consulta.data ?? []).filter(item =>
    `${item.nome} ${item.email}`.toLocaleLowerCase('pt-BR').includes(termo)
    && (!papel || item.role === papel)
    && (!setorId || item.setorId === setorId)
    && (!status || item.ativo === (status === 'ativo')),
  )
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / TAMANHO_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * TAMANHO_PAGINA
  const mapaSetores = new Map(setores.data?.map(setor => [setor.id, setor.nome]))

  function fecharExclusao() { if (!excluir.isPending) setExclusao(null) }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900 liquido:font-display liquido:text-3xl liquido:font-bold">Usuários</h1><p className="text-sm text-slate-500">Gerencie colaboradores, setores e perfis de acesso.</p></div>
        <Botao variante="primario" disabled={!setores.isSuccess} onClick={() => setEdicao('novo')} className="flex items-center gap-2"><IconeMais tamanho={18} />Novo usuário</Botao>
      </div>
      <div className="surface grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <Campo rotulo="Buscar por nome ou e-mail"><Input type="search" value={busca} onChange={evento => { setBusca(evento.target.value); setPagina(1) }} placeholder="Buscar usuário" /></Campo>
        <Campo rotulo="Perfil"><Select value={papel} onChange={evento => { setPapel(evento.target.value); setPagina(1) }}><option value="">Todos os perfis</option>{Object.entries(ROTULOS_PAPEL).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</Select></Campo>
        <Campo rotulo="Setor"><Select value={setorId} onChange={evento => { setSetorId(evento.target.value); setPagina(1) }}><option value="">Todos os setores</option>{setores.data?.map(setor => <option key={setor.id} value={setor.id}>{setor.nome}</option>)}</Select></Campo>
        <Campo rotulo="Status"><Select value={status} onChange={evento => { setStatus(evento.target.value); setPagina(1) }}><option value="">Todos</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option></Select></Campo>
      </div>
      {setores.isError && <div role="alert" className="text-sm text-critical">Não foi possível carregar os setores. <button type="button" onClick={() => void setores.refetch()} className="underline">Tentar novamente</button></div>}
      {consulta.isPending && <p role="status" className="text-sm text-slate-500">Carregando usuários…</p>}
      {consulta.isError && <div role="alert" className="text-sm text-critical">{mensagemErroUsuario(consulta.error)} <button type="button" className="underline" onClick={() => void consulta.refetch()}>Tentar novamente</button></div>}
      {consulta.isSuccess && <>
        <TabelaUsuarios usuarios={filtrados.slice(inicio, inicio + TAMANHO_PAGINA)} setores={mapaSetores} edicaoDisponivel={setores.isSuccess} aoEditar={item => { if (setores.isSuccess) setEdicao(item) }} aoExcluir={item => { excluir.reset(); setExclusao(item) }} />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
          <span>{filtrados.length} usuário(s) · Página {paginaAtual} de {totalPaginas}</span>
          <div className="flex gap-2"><Botao disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}>Anterior</Botao><Botao disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>Próxima</Botao></div>
        </div>
      </>}
      {edicao !== null && <ModalUsuario key={edicao === 'novo' ? 'novo' : edicao.id} usuarioEditando={edicao === 'novo' ? null : edicao} setores={setores.data ?? []} aoFechar={() => setEdicao(null)} />}
      {exclusao && <Modal aberto titulo="Excluir usuário" aoFechar={fecharExclusao}>
        <p className="text-sm text-slate-600">O acesso de <strong>{exclusao.nome}</strong> será desativado. O histórico será preservado e você poderá reativar o usuário pela edição.</p>
        {excluir.isError && <p role="alert" className="mt-3 text-sm text-critical">{mensagemErroUsuario(excluir.error)}</p>}
        <div className="mt-5 flex justify-end gap-2"><Botao disabled={excluir.isPending} onClick={fecharExclusao}>Cancelar</Botao><Botao variante="primario" disabled={excluir.isPending} onClick={() => excluir.mutate(exclusao.id, { onSuccess: () => setExclusao(null) })}>{excluir.isPending ? 'Desativando…' : 'Confirmar exclusão'}</Botao></div>
      </Modal>}
    </div>
  )
}
