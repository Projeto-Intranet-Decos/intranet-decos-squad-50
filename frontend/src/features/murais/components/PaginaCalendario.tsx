import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../lib/auth/useAuth'
import { podeEditar } from '../../../lib/permissions'
import { IconeAlerta } from '../../../shared/components/icones'
import {
  agruparEventosPorDia,
  dataDeChave,
  deslocarPeriodo,
  intervaloDoPeriodo,
  mesesDoPeriodo,
  tituloDoPeriodo,
} from '../formatadoresCalendario'
import { useAniversariantes } from '../hooks/useAniversariantes'
import { useEventos } from '../hooks/useEventos'
import { useExcluirAviso } from '../hooks/useExcluirAviso'
import { useProximosEventos } from '../hooks/useProximosEventos'
import { useSetoresMural } from '../hooks/useSetoresMural'
import type { Aniversariante, Aviso, VisaoCalendario } from '../types'
import CabecalhoCalendario from './CabecalhoCalendario'
import ModalAviso from './ModalAviso'
import ModalDetalheAviso from './ModalDetalheAviso'
import PainelAniversariantes from './PainelAniversariantes'
import PainelProximosEventos from './PainelProximosEventos'
import VisaoAno from './VisaoAno'
import VisaoDia from './VisaoDia'
import VisaoMes from './VisaoMes'
import VisaoSemana from './VisaoSemana'

const DURACAO_DESTAQUE_MS = 1000

/**
 * Visão do mural que posiciona os eventos (avisos de categoria `evento`) nas suas datas
 * (MUR-15). Clicar num evento abre o mesmo detalhe de aviso do mural. Só exibe: evento é
 * criado no mural.
 */
function PaginaCalendario() {
  const { usuario } = useAuth()
  // `?data=AAAA-MM-DD` ("Ver no calendário", MUR-15): abre no mês da data e destaca o dia.
  const [parametros] = useSearchParams()
  const { key: chaveDaNavegacao } = useLocation()
  const diaPedido = parametros.get('data')
  const dataPedida = diaPedido ? dataDeChave(diaPedido) : null

  const [visao, setVisao] = useState<VisaoCalendario>('mes')
  const [dataReferencia, setDataReferencia] = useState(() => dataPedida ?? new Date())
  const [diaDestacado, setDiaDestacado] = useState(() => (dataPedida ? diaPedido : null))
  const [navegacaoAplicada, setNavegacaoAplicada] = useState(chaveDaNavegacao)
  const [modalAberto, setModalAberto] = useState(false)
  const [avisoEditando, setAvisoEditando] = useState<Aviso | null>(null)
  const [detalhe, setDetalhe] = useState<Aviso | null>(null)

  // O botão também funciona com o calendário já aberto: cada navegação nova aplica a data uma vez.
  if (navegacaoAplicada !== chaveDaNavegacao) {
    setNavegacaoAplicada(chaveDaNavegacao)
    if (dataPedida) {
      setDataReferencia(dataPedida)
      setVisao('mes')
      setDiaDestacado(diaPedido)
    }
  }

  // O destaque some com a animação (1s, `.destaque-dia` no index.css), para não repetir ao trocar
  // de mês e voltar.
  useEffect(() => {
    if (!diaDestacado) return
    const id = setTimeout(() => setDiaDestacado(null), DURACAO_DESTAQUE_MS)
    return () => clearTimeout(id)
  }, [diaDestacado])

  const meses = useMemo(() => mesesDoPeriodo(dataReferencia, visao), [dataReferencia, visao])

  const { data: eventos = [], isLoading, isError } = useEventos(intervaloDoPeriodo(dataReferencia, visao))
  const proximosEventos = useProximosEventos()
  const aniversariantesPorMes = useAniversariantes(meses)
  const { data: setores = [] } = useSetoresMural()
  const excluirAviso = useExcluirAviso()

  const eventosPorDia = useMemo(() => agruparEventosPorDia(eventos), [eventos])

  function aniversariantesDoDia(data: Date): Aniversariante[] {
    return (aniversariantesPorMes.get(data.getMonth() + 1) ?? []).filter((pessoa) => pessoa.dia === data.getDate())
  }

  function podeGerenciarEsteAviso(aviso: Aviso) {
    return usuario ? podeEditar(usuario, aviso) : false
  }

  function periodoAnterior() {
    setDataReferencia((atual) => deslocarPeriodo(atual, visao, -1))
  }

  function proximoPeriodo() {
    setDataReferencia((atual) => deslocarPeriodo(atual, visao, 1))
  }

  function abrirMes(mes: number) {
    setDataReferencia(new Date(dataReferencia.getFullYear(), mes, 1))
    setVisao('mes')
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
    if (window.confirm(`Excluir o evento "${aviso.titulo}"? Essa ação não pode ser desfeita.`)) {
      excluirAviso.mutate(aviso.id, { onSuccess: () => setDetalhe(null) })
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-slate-900 liquido:font-display liquido:text-3xl liquido:font-bold">Calendário</h1>
      </div>

      {isLoading && <p className="mb-4 text-sm text-slate-600">Carregando eventos…</p>}

      {/* Sem o backend rodando, as chamadas à API falham e este aviso aparece;
          as visões continuam renderizando (vazias) para permitir ver o layout. */}
      {isError && (
        <p className="surface mb-4 flex items-center gap-2.5 !border-l-4 !border-l-critical px-4 py-3 text-sm text-critical">
          <IconeAlerta tamanho={18} className="flex-none" />
          Não foi possível carregar os eventos. Verifique se o backend está no ar e tente novamente.
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-[22px] lg:grid-cols-[minmax(0,1fr)_316px]">
        <div className="surface min-w-0 p-4 sm:p-5 liquido:sm:p-6">
          <CabecalhoCalendario
            titulo={tituloDoPeriodo(dataReferencia, visao)}
            visao={visao}
            aoMudarVisao={setVisao}
            aoAnterior={periodoAnterior}
            aoProximo={proximoPeriodo}
          />
          {visao === 'dia' && (
            <VisaoDia
              data={dataReferencia}
              eventosPorDia={eventosPorDia}
              aniversariantesDoDia={aniversariantesDoDia}
              aoAbrirEvento={setDetalhe}
            />
          )}
          {visao === 'semana' && (
            <VisaoSemana
              data={dataReferencia}
              eventosPorDia={eventosPorDia}
              aniversariantesDoDia={aniversariantesDoDia}
              aoAbrirEvento={setDetalhe}
            />
          )}
          {visao === 'mes' && (
            <VisaoMes
              ano={dataReferencia.getFullYear()}
              mes={dataReferencia.getMonth()}
              eventosPorDia={eventosPorDia}
              aniversariantesDoDia={aniversariantesDoDia}
              aoAbrirEvento={setDetalhe}
              diaDestacado={diaDestacado}
            />
          )}
          {visao === 'ano' && (
            <VisaoAno
              ano={dataReferencia.getFullYear()}
              eventosPorDia={eventosPorDia}
              aniversariantesDoDia={aniversariantesDoDia}
              aoAbrirMes={abrirMes}
            />
          )}
        </div>
        <div className="grid grid-cols-1 items-start gap-[22px] md:grid-cols-2 lg:flex lg:flex-col lg:items-stretch">
          <PainelAniversariantes
            mes={dataReferencia.getMonth() + 1}
            aniversariantes={aniversariantesPorMes.get(dataReferencia.getMonth() + 1) ?? []}
          />
          <PainelProximosEventos eventos={proximosEventos} aoAbrir={setDetalhe} />
        </div>
      </div>

      {/* Só edição, a partir do detalhe: evento novo é criado no mural. */}
      {modalAberto && avisoEditando && (
        <ModalAviso
          key={avisoEditando.id}
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

export default PaginaCalendario
