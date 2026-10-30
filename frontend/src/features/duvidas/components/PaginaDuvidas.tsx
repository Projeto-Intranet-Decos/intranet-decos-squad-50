import { useMemo, useState } from 'react'
import { useAuth } from '../../../lib/auth/useAuth'
import { canEditar, canEscolherSetor, canGerenciarConteudo } from '../../../lib/permissions'
import Botao from '../../../shared/components/Botao'
import { IconeMais } from '../../../shared/components/icones'
import ModalConfirmacao from '../../../shared/components/ModalConfirmacao'
import { useExcluirFaq } from '../hooks/useExcluirFaq'
import { useFaq } from '../hooks/useFaq'
import { useSetoresDuvidas } from '../hooks/useSetoresDuvidas'
import type { Faq } from '../types'
import ModalFaq from './ModalFaq'
import PainelFaq from './PainelFaq'

function PaginaDuvidas() {
  const { usuario } = useAuth()
  const { data: faq = [], isLoading, isError } = useFaq()
  const escolheSetor = canEscolherSetor(usuario)
  const { data: setores = [] } = useSetoresDuvidas(escolheSetor)
  const excluirFaq = useExcluirFaq()

  const [busca, setBusca] = useState('')
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [faqEditando, setFaqEditando] = useState<Faq | null>(null)
  const [faqExcluindo, setFaqExcluindo] = useState<Faq | null>(null)

  const podeCriar = canGerenciarConteudo(usuario)

  const faqFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return faq
    return faq.filter((item) => `${item.pergunta} ${item.resposta}`.toLowerCase().includes(termo))
  }, [faq, busca])

  function podeGerenciarEstaFaq(item: Faq) {
    return canEditar(usuario, { setorId: item.setorId })
  }

  function alternarExpandido(id: string) {
    setExpandidoId((atual) => (atual === id ? null : id))
  }

  function abrirNovaFaq() {
    setFaqEditando(null)
    setModalAberto(true)
  }

  function abrirEdicao(item: Faq) {
    setFaqEditando(item)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setFaqEditando(null)
  }

  function aoExcluir(item: Faq) {
    setFaqExcluindo(item)
  }

  if (isError) {
    return <p className="text-sm text-critical">Não foi possível carregar a FAQ. Tente novamente.</p>
  }

  return (
    <div>
      <div className="mb-[22px] flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-slate-900 liquido:font-display liquido:text-3xl liquido:font-bold">Central de dúvidas</h1>
        {podeCriar && (
          <Botao variante="primario" onClick={abrirNovaFaq} className="w-full sm:w-auto">
            <IconeMais tamanho={15} />
            Nova dúvida
          </Botao>
        )}
      </div>

      <PainelFaq
        busca={busca}
        aoMudarBusca={setBusca}
        itens={faqFiltrada}
        isLoading={isLoading}
        expandidoId={expandidoId}
        aoAlternar={alternarExpandido}
        podeGerenciar={podeGerenciarEstaFaq}
        aoEditar={abrirEdicao}
        aoExcluir={aoExcluir}
      />

      {modalAberto && (
        <ModalFaq
          key={faqEditando?.id ?? 'novo'}
          aoFechar={fecharModal}
          faqEditando={faqEditando}
          setores={setores}
          escolheSetor={escolheSetor}
        />
      )}

      {faqExcluindo && (
        <ModalConfirmacao
          titulo="Excluir pergunta"
          pergunta="Tem certeza que deseja excluir esta pergunta?"
          destaque={faqExcluindo.pergunta}
          rotuloConfirmar="Excluir pergunta"
          processando={excluirFaq.isPending}
          aoConfirmar={() => excluirFaq.mutate(faqExcluindo.id, { onSuccess: () => setFaqExcluindo(null) })}
          aoFechar={() => setFaqExcluindo(null)}
        />
      )}
    </div>
  )
}

export default PaginaDuvidas
