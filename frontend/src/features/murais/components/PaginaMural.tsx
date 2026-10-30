import { useMemo, useState } from 'react'
import { useAuth } from '../../../lib/auth/useAuth'
import { canBaixarArquivos, canEditar, canGerenciarConteudo } from '../../../lib/permissions'
import ModalConfirmacao from '../../../shared/components/ModalConfirmacao'
import Skeleton from '../../../shared/components/Skeleton'
import { useAniversariantes } from '../hooks/useAniversariantes'
import { useAvisos } from '../hooks/useAvisos'
import { useExcluirAviso } from '../hooks/useExcluirAviso'
import { useProximosEventos } from '../hooks/useProximosEventos'
import { useSetoresMural } from '../hooks/useSetoresMural'
import type { Aviso, CategoriaAviso } from '../types'
import BarraFiltrosMural from './BarraFiltrosMural'
import CarrosselDestaques from './CarrosselDestaques'
import ListaAvisos from './ListaAvisos'
import ModalAviso from './ModalAviso'
import ModalDetalheAviso from './ModalDetalheAviso'
import PainelAniversariantes from './PainelAniversariantes'
import PainelFixados from './PainelFixados'
import PainelProximosEventos from './PainelProximosEventos'

function PainelSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden surface">
      <div className="tabela-cabecalho flex items-center justify-between gap-3 px-[18px] py-3 liquido:px-5 liquido:pt-4 liquido:pb-3">
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="flex flex-col gap-3 px-[18px] py-[18px] liquido:px-5">
        {[0, 1, 2].map((indice) => (
          <div key={indice} className="flex items-center gap-[11px]">
            <Skeleton className="size-[34px] flex-none rounded-full liquido:size-9" />
            <Skeleton className={`h-4 ${indice % 2 === 0 ? 'w-32' : 'w-24'}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

function CartaoAvisoSkeleton({ indice }: { indice: number }) {
  return (
    <div className="grid grid-cols-[48px_20px_minmax(0,1fr)] items-start gap-x-2 sm:grid-cols-[88px_26px_minmax(0,1fr)]">
      <Skeleton className="mt-3.5 h-4 w-10" />
      <div />
      <div className="flex flex-col gap-2 pt-3.5">
        <Skeleton className={`h-4 ${indice % 2 === 0 ? 'w-64' : 'w-48'}`} />
        <Skeleton className="h-3.5 w-full max-w-md" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  )
}

function MuralSkeleton() {
  return (
    <div>
      <Skeleton className="mb-6 h-[280px] w-full rounded-card sm:h-[400px] liquido:rounded-panel" />

      <div className="mb-[22px] grid grid-cols-1 items-start gap-[22px] md:grid-cols-2">
        <PainelSkeleton />
        <PainelSkeleton />
      </div>

      <div className="mb-[22px]">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-slate-900 liquido:font-display liquido:text-3xl liquido:font-bold">Mural de avisos</h1>
      </div>

      <div className="grid grid-cols-1 items-start gap-[22px] lg:grid-cols-[minmax(0,1fr)_316px]">
        <div className="lg:col-start-2 lg:row-start-1">
          <PainelSkeleton />
        </div>
        <div className="flex min-w-0 flex-col gap-[26px]">
          {Array.from({ length: 4 }, (_, indice) => <CartaoAvisoSkeleton key={indice} indice={indice} />)}
        </div>
      </div>
    </div>
  )
}

function PaginaMural() {
  const { usuario } = useAuth()
  const { data: avisos = [], isLoading, isError } = useAvisos()
  const { data: setores = [] } = useSetoresMural()
  const excluirAviso = useExcluirAviso()

  const mesAtual = useMemo(() => new Date().getMonth() + 1, [])
  const proximosEventos = useProximosEventos()
  const aniversariantes = useAniversariantes([mesAtual]).get(mesAtual) ?? []

  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState<CategoriaAviso | ''>('')
  const [setorId, setSetorId] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [avisoEditando, setAvisoEditando] = useState<Aviso | null>(null)
  const [detalhe, setDetalhe] = useState<Aviso | null>(null)
  const [exclusao, setExclusao] = useState<{ aviso: Aviso; voltarAoDetalhe: boolean } | null>(null)

  const podeCriar = canGerenciarConteudo(usuario)

  // Força a lista a remontar a cada mudança de filtro, pra reanimar a entrada
  // dos cards (motion.div com `initial` só anima na primeira montagem).
  const chaveFiltroAvisos = `${busca}|${categoria}|${setorId}|${de}|${ate}`

  const avisosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const inicio = de ? new Date(`${de}T00:00:00`) : null
    const fim = ate ? new Date(`${ate}T23:59:59`) : null
    return avisos.filter((aviso) => {
      if (categoria && aviso.categoria !== categoria) return false
      if (setorId && aviso.setorId !== setorId) return false
      const publicadoEm = new Date(aviso.criadoEm)
      if (inicio && publicadoEm < inicio) return false
      if (fim && publicadoEm > fim) return false
      if (termo) {
        const alvo = `${aviso.titulo} ${aviso.autorNome} ${aviso.conteudo ?? ''}`.toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      return true
    })
  }, [avisos, categoria, setorId, busca, de, ate])

  // Destaques e fixados ignoram os filtros da barra de busca
  const destaques = useMemo(() => avisos.slice(0, 5), [avisos])
  const fixados = useMemo(() => avisos.filter((a) => a.fixado), [avisos])

  function podeGerenciarEsteAviso(aviso: Aviso) {
    return canEditar(usuario, aviso)
  }

  function abrirNovoAviso() {
    setAvisoEditando(null)
    setModalAberto(true)
  }

  function abrirEdicao(aviso: Aviso) {
    setDetalhe(null)
    setAvisoEditando(aviso)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setAvisoEditando(null)
  }

  // O detalhe fecha enquanto a confirmação está aberta (dois modais empilhados brigariam pelo Esc e
  // pelo foco) e volta se a pessoa cancelar.
  function aoExcluir(aviso: Aviso) {
    setExclusao({ aviso, voltarAoDetalhe: detalhe?.id === aviso.id })
    setDetalhe(null)
  }

  function cancelarExclusao() {
    if (exclusao?.voltarAoDetalhe) setDetalhe(exclusao.aviso)
    setExclusao(null)
  }

  if (isLoading) {
    return <MuralSkeleton />
  }

  if (isError) {
    return <p className="text-sm text-critical">Não foi possível carregar os avisos. Tente novamente.</p>
  }

  return (
    <div>
      <CarrosselDestaques destaques={destaques} aoAbrir={setDetalhe} />

      <div className="mb-[22px] grid grid-cols-1 items-start gap-[22px] md:grid-cols-2">
        <PainelAniversariantes mes={mesAtual} aniversariantes={aniversariantes} />
        <PainelProximosEventos eventos={proximosEventos} aoAbrir={setDetalhe} />
      </div>

      <div className="mb-[22px]">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-slate-900 liquido:font-display liquido:text-3xl liquido:font-bold">Mural de avisos</h1>
      </div>

      <BarraFiltrosMural
        busca={busca}
        aoMudarBusca={setBusca}
        categoria={categoria}
        aoMudarCategoria={setCategoria}
        setorId={setorId}
        aoMudarSetor={setSetorId}
        setores={setores}
        de={de}
        aoMudarDe={setDe}
        ate={ate}
        aoMudarAte={setAte}
        podeCriar={podeCriar}
        aoNovoAviso={abrirNovoAviso}
      />

      {/* Fixados vem antes no DOM pra ficar no topo no mobile; no desktop volta pra coluna da direita */}
      <div className="grid grid-cols-1 items-start gap-[22px] lg:grid-cols-[minmax(0,1fr)_316px]">
        <div className="lg:col-start-2 lg:row-start-1">
          <PainelFixados fixados={fixados} aoAbrir={setDetalhe} />
        </div>
        <ListaAvisos
          key={chaveFiltroAvisos}
          avisos={avisosFiltrados}
          podeGerenciarAviso={podeGerenciarEsteAviso}
          aoAbrir={setDetalhe}
          aoEditar={abrirEdicao}
          aoExcluir={aoExcluir}
        />
      </div>

      {modalAberto && (
         //reseta o estado local (RHF + anexos) sem precisar de setState em efeito.
        <ModalAviso
          key={avisoEditando?.id ?? 'novo'}
          aoFechar={fecharModal}
          avisoEditando={avisoEditando}
          setores={setores}
          usuario={usuario}
        />
      )}
      <ModalDetalheAviso
        aviso={detalhe}
        aoFechar={() => setDetalhe(null)}
        aoEditar={detalhe && podeGerenciarEsteAviso(detalhe) ? abrirEdicao : undefined}
        aoExcluir={detalhe && podeGerenciarEsteAviso(detalhe) ? aoExcluir : undefined}
        podeBaixarAnexos={canBaixarArquivos(usuario)}
      />
      {exclusao && (
        <ModalConfirmacao
          titulo="Excluir aviso"
          pergunta="Tem certeza que deseja excluir este aviso?"
          destaque={exclusao.aviso.titulo}
          rotuloConfirmar="Excluir aviso"
          processando={excluirAviso.isPending}
          aoConfirmar={() => excluirAviso.mutate(exclusao.aviso.id, { onSuccess: () => setExclusao(null) })}
          aoFechar={cancelarExclusao}
        />
      )}
    </div>
  )
}

export default PaginaMural
