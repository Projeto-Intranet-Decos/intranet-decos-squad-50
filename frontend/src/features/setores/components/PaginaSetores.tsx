import { useMemo, useState } from 'react'
import { useAuth } from '../../../lib/auth/useAuth'
import { canAdministrarSetores, canGerenciarSetor } from '../../../lib/permissions'
import { useOrdenacaoClique } from '../../../shared/hooks/useOrdenacaoClique'
import { useExcluirSetor } from '../hooks/useExcluirSetor'
import { useSetores } from '../hooks/useSetores'
import type { OrdemSetores, SetorComRamais } from '../types'
import BarraFiltrosSetores from './BarraFiltrosSetores'
import ModalSetor from './ModalSetor'
import TabelaSetores from './TabelaSetores'

function compararPrimeiroRamal(a: SetorComRamais, b: SetorComRamais): number {
  const ramalA = a.ramais[0]?.numero
  const ramalB = b.ramais[0]?.numero
  if (!ramalA) return ramalB ? 1 : 0
  if (!ramalB) return -1
  return ramalA.localeCompare(ramalB, 'pt-BR', { numeric: true })
}

function PaginaSetores() {
  const { usuario } = useAuth()
  const { data: setores = [], isLoading, isError } = useSetores()
  const excluirSetor = useExcluirSetor()

  const [busca, setBusca] = useState('')
  const { coluna: ordem, direcao, aoClicarColuna } = useOrdenacaoClique<OrdemSetores>('nome')
  const [modalAberto, setModalAberto] = useState(false)
  const [setorEditando, setSetorEditando] = useState<SetorComRamais | null>(null)

  const canAdministrar = canAdministrarSetores(usuario)

  const setoresVisiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const filtrados = termo
      ? setores.filter(
          (setor) =>
            setor.nome.toLowerCase().includes(termo) || setor.ramais.some((ramal) => ramal.numero.includes(termo)),
        )
      : setores
    const ordenados = [...filtrados].sort((a, b) =>
      ordem === 'ramal' ? compararPrimeiroRamal(a, b) : a.nome.localeCompare(b.nome, 'pt-BR'),
    )
    return direcao === 'desc' ? ordenados.reverse() : ordenados
  }, [setores, busca, ordem, direcao])

  function podeEditarSetor(setor: SetorComRamais) {
    return canGerenciarSetor(usuario, setor.id)
  }

  function abrirNovoSetor() {
    setSetorEditando(null)
    setModalAberto(true)
  }

  function abrirEdicao(setor: SetorComRamais) {
    setSetorEditando(setor)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setSetorEditando(null)
  }

  function aoExcluir(setor: SetorComRamais) {
    const mensagem = `Excluir o setor "${setor.nome}" e todos os seus ramais? Essa ação não pode ser desfeita.`
    if (window.confirm(mensagem)) {
      excluirSetor.mutate(setor.id)
    }
  }

  if (isError) {
    return <p className="text-sm text-critical">Não foi possível carregar os setores. Tente novamente.</p>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-slate-900 liquido:font-display liquido:text-3xl liquido:font-bold">Setores e ramais</h1>
      </div>

      <BarraFiltrosSetores
        busca={busca}
        aoMudarBusca={setBusca}
        podeCriar={canAdministrar}
        aoNovoSetor={abrirNovoSetor}
      />

      <TabelaSetores
        setores={setoresVisiveis}
        isLoading={isLoading}
        ordem={ordem}
        direcao={direcao}
        aoClicarColuna={aoClicarColuna}
        podeEditarSetor={podeEditarSetor}
        podeExcluir={canAdministrar}
        aoEditar={abrirEdicao}
        aoExcluir={aoExcluir}
      />

      {modalAberto && (
        <ModalSetor
          key={setorEditando?.id ?? 'novo'}
          aoFechar={fecharModal}
          setorEditando={setorEditando}
          podeRenomear={canAdministrar}
        />
      )}
    </div>
  )
}

export default PaginaSetores
