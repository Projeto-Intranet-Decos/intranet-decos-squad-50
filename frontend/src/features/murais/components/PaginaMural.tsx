import { useMemo, useState } from 'react'
import { useAuth } from '../../../lib/auth/useAuth'
import { podeEditar, podeGerenciarConteudo } from '../../../lib/permissions'
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
  const [modalAberto, setModalAberto] = useState(false)
  const [avisoEditando, setAvisoEditando] = useState<Aviso | null>(null)
  const [detalhe, setDetalhe] = useState<Aviso | null>(null)

  const podeCriar = podeGerenciarConteudo(usuario)

  const avisosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return avisos.filter((aviso) => {
      if (categoria && aviso.categoria !== categoria) return false
      if (setorId && aviso.setorId !== setorId) return false
      if (termo) {
        const alvo = `${aviso.titulo} ${aviso.autorNome} ${aviso.conteudo ?? ''}`.toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      return true
    })
  }, [avisos, categoria, setorId, busca])

  // Destaques e fixados ignoram os filtros da barra de busca
  const destaques = useMemo(() => avisos.slice(0, 5), [avisos])
  const fixados = useMemo(() => avisos.filter((a) => a.fixado), [avisos])

  function podeGerenciarEsteAviso(aviso: Aviso) {
    return usuario ? podeEditar(usuario, aviso) : false
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

  function aoExcluir(aviso: Aviso) {
    if (window.confirm(`Excluir o aviso "${aviso.titulo}"? Essa ação não pode ser desfeita.`)) {
      excluirAviso.mutate(aviso.id, { onSuccess: () => setDetalhe(null) })
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Carregando mural…</p>
  }

  if (isError) {
    return <p className="text-sm text-red-600">Não foi possível carregar os avisos. Tente novamente.</p>
  }

  return (
    <div>
      <CarrosselDestaques destaques={destaques} aoAbrir={setDetalhe} />

      <div className="mb-[22px] grid grid-cols-2 items-start gap-[22px]">
        <PainelAniversariantes mes={mesAtual} aniversariantes={aniversariantes} />
        <PainelProximosEventos eventos={proximosEventos} aoAbrir={setDetalhe} />
      </div>

      <div className="mb-[22px]">
        <h1 className="m-0 text-[31px] font-bold tracking-tight text-slate-900">Mural de avisos</h1>
      </div>

      <BarraFiltrosMural
        busca={busca}
        aoMudarBusca={setBusca}
        categoria={categoria}
        aoMudarCategoria={setCategoria}
        setorId={setorId}
        aoMudarSetor={setSetorId}
        setores={setores}
        podeCriar={podeCriar}
        aoNovoAviso={abrirNovoAviso}
      />

      <div className="grid grid-cols-[minmax(0,1fr)_316px] items-start gap-[22px]">
        <ListaAvisos
          avisos={avisosFiltrados}
          podeGerenciarAviso={podeGerenciarEsteAviso}
          aoAbrir={setDetalhe}
          aoEditar={abrirEdicao}
          aoExcluir={aoExcluir}
        />
        <PainelFixados fixados={fixados} aoAbrir={setDetalhe} />
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
      />
    </div>
  )
}

export default PaginaMural
