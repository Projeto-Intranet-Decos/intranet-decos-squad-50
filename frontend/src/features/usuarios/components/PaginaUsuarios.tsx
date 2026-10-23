import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { IconeFunil, IconeLupa, IconeMais } from '../../../shared/components/icones'
import { useAuth } from '../../../lib/auth/useAuth'
import { canAcessarAdministracao } from '../../../lib/permissions'
import Botao from '../../../shared/components/Botao'
import Dropdown from '../../../shared/components/Dropdown'
import Modal from '../../../shared/components/Modal'
import { useOrdenacaoClique } from '../../../shared/hooks/useOrdenacaoClique'
import { listarSetores } from '../../setores/api'
import { mensagemErroUsuario, useExcluirUsuario, useUsuarios } from '../hooks/useUsuarios'
import { ROTULOS_PAPEL, type ColunaUsuario, type UsuarioCadastro } from '../types'
import ModalUsuario from './ModalUsuario'
import TabelaUsuarios from './TabelaUsuarios'

const TAMANHO_PAGINA = 10

function compararUsuarios(a: UsuarioCadastro, b: UsuarioCadastro, coluna: ColunaUsuario, setores: Map<string, string>): number {
  switch (coluna) {
    case 'perfil':
      return ROTULOS_PAPEL[a.role].localeCompare(ROTULOS_PAPEL[b.role], 'pt-BR')
    case 'setor': {
      const nomeA = a.setorId ? setores.get(a.setorId) ?? '' : ''
      const nomeB = b.setorId ? setores.get(b.setorId) ?? '' : ''
      return nomeA.localeCompare(nomeB, 'pt-BR')
    }
    case 'status':
      return Number(a.ativo) - Number(b.ativo)
    default:
      return a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })
  }
}

export default function PaginaUsuarios() {
  const { usuario } = useAuth()
  const permitido = canAcessarAdministracao(usuario)
  const consulta = useUsuarios(usuario?.id, permitido)
  const setores = useQuery({ queryKey: ['setores-usuarios'], queryFn: listarSetores, enabled: permitido })
  const excluir = useExcluirUsuario()
  const [busca, setBusca] = useState('')
  const [papel, setPapel] = useState('')
  const [setorId, setSetorId] = useState('')
  const [status, setStatus] = useState('')
  const { coluna: ordenarPor, direcao, aoClicarColuna } = useOrdenacaoClique<ColunaUsuario>('nome')
  const [pagina, setPagina] = useState(1)
  const [edicao, setEdicao] = useState<UsuarioCadastro | 'novo' | null>(null)
  const [exclusao, setExclusao] = useState<UsuarioCadastro | null>(null)

  if (!usuario) return <Navigate to="/login" replace />
  if (!permitido) return <Navigate to="/nao-autorizado" replace />

  const mapaSetores = new Map(setores.data?.map(setor => [setor.id, setor.nome]))
  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const filtrados = (consulta.data ?? []).filter(item =>
    `${item.nome} ${item.email}`.toLocaleLowerCase('pt-BR').includes(termo)
    && (!papel || item.role === papel)
    && (!setorId || item.setorId === setorId)
    && (!status || item.ativo === (status === 'ativo')),
  ).sort((a, b) => {
    const resultado = compararUsuarios(a, b, ordenarPor, mapaSetores)
    return direcao === 'desc' ? -resultado : resultado
  })
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / TAMANHO_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * TAMANHO_PAGINA

  function fecharExclusao() { if (!excluir.isPending) setExclusao(null) }

  return (
    <div>
      <div className="mb-6">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-slate-900 liquido:font-display liquido:text-3xl liquido:font-bold">Usuários</h1>
        <p className="text-sm text-slate-500">Gerencie colaboradores, setores e perfis de acesso.</p>
      </div>

      <div className="mb-5 flex flex-wrap items-stretch gap-3 sm:gap-3.5">
        <label className="relative block w-full sm:w-auto sm:flex-[0_1_320px]">
          <IconeLupa
            tamanho={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-500 liquido:left-4"
          />
          <input
            aria-label="Buscar por nome ou e-mail"
            value={busca}
            onChange={evento => { setBusca(evento.target.value); setPagina(1) }}
            placeholder="Buscar por nome ou e-mail"
            className="field h-full py-2.5 pl-[38px] text-[13.5px] liquido:capsule-field liquido:pl-10 liquido:text-sm"
          />
        </label>

        <Dropdown
          rotuloPadrao="Perfil"
          icone={<IconeFunil tamanho={15} />}
          opcoes={[{ valor: '', rotulo: 'Todos os perfis' }, ...Object.entries(ROTULOS_PAPEL).map(([valor, rotulo]) => ({ valor, rotulo }))]}
          valor={papel}
          aoMudar={valor => { setPapel(valor); setPagina(1) }}
        />

        <Dropdown
          rotuloPadrao="Setor"
          icone={<IconeFunil tamanho={15} />}
          opcoes={[{ valor: '', rotulo: 'Todos os setores' }, ...(setores.data ?? []).map(setor => ({ valor: setor.id, rotulo: setor.nome }))]}
          valor={setorId}
          aoMudar={valor => { setSetorId(valor); setPagina(1) }}
        />

        <Dropdown
          rotuloPadrao="Status"
          icone={<IconeFunil tamanho={15} />}
          opcoes={[{ valor: '', rotulo: 'Todos' }, { valor: 'ativo', rotulo: 'Ativos' }, { valor: 'inativo', rotulo: 'Inativos' }]}
          valor={status}
          aoMudar={valor => { setStatus(valor); setPagina(1) }}
        />

        <Botao
          variante="primario"
          disabled={!setores.isSuccess}
          onClick={() => setEdicao('novo')}
          className="w-full flex-none sm:ml-auto sm:w-auto"
        >
          <IconeMais tamanho={15} />
          Novo usuário
        </Botao>
      </div>

      {setores.isError && <div role="alert" className="mb-4 text-sm text-critical">Não foi possível carregar os setores. <button type="button" onClick={() => void setores.refetch()} className="underline">Tentar novamente</button></div>}
      {consulta.isError && <div role="alert" className="text-sm text-critical">{mensagemErroUsuario(consulta.error)} <button type="button" className="underline" onClick={() => void consulta.refetch()}>Tentar novamente</button></div>}
      {!consulta.isError && <>
        <TabelaUsuarios usuarios={filtrados.slice(inicio, inicio + TAMANHO_PAGINA)} isLoading={consulta.isPending} setores={mapaSetores} ordenarPor={ordenarPor} direcao={direcao} aoClicarColuna={aoClicarColuna} edicaoDisponivel={setores.isSuccess} aoEditar={item => { if (setores.isSuccess) setEdicao(item) }} aoExcluir={item => { excluir.reset(); setExclusao(item) }} />
        {consulta.isSuccess && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <span>{filtrados.length} usuário(s) · Página {paginaAtual} de {totalPaginas}</span>
            <div className="flex gap-2"><Botao disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}>Anterior</Botao><Botao disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>Próxima</Botao></div>
          </div>
        )}
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
