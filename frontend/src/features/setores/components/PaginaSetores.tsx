import { useMemo, useState } from 'react'
import { useAuth } from '../../../lib/auth/useAuth'
import { podeEditar } from '../../../lib/permissions'
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
  const [ordem, setOrdem] = useState<OrdemSetores>('nome')
  const [modalAberto, setModalAberto] = useState(false)
  const [setorEditando, setSetorEditando] = useState<SetorComRamais | null>(null)

  const superadmin = usuario?.role === 'superadmin'

  const setoresVisiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const filtrados = termo
      ? setores.filter(
          (setor) =>
            setor.nome.toLowerCase().includes(termo) || setor.ramais.some((ramal) => ramal.numero.includes(termo)),
        )
      : setores
    return [...filtrados].sort((a, b) =>
      ordem === 'ramal' ? compararPrimeiroRamal(a, b) : a.nome.localeCompare(b.nome, 'pt-BR'),
    )
  }, [setores, busca, ordem])

  function podeEditarSetor(setor: SetorComRamais) {
    return usuario ? podeEditar(usuario, { setorId: setor.id }) : false
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

  if (isLoading) {
    return <p className="text-sm text-slate-600">Carregando setores…</p>
  }

  if (isError) {
    return <p className="text-sm text-critical">Não foi possível carregar os setores. Tente novamente.</p>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-slate-900 ios:font-display ios:text-3xl ios:font-bold">Setores e ramais</h1>
      </div>

      <BarraFiltrosSetores
        busca={busca}
        aoMudarBusca={setBusca}
        ordem={ordem}
        aoMudarOrdem={setOrdem}
        podeCriar={superadmin}
        aoNovoSetor={abrirNovoSetor}
      />

      <TabelaSetores
        setores={setoresVisiveis}
        podeEditarSetor={podeEditarSetor}
        podeExcluir={superadmin}
        aoEditar={abrirEdicao}
        aoExcluir={aoExcluir}
      />

      {modalAberto && (
        <ModalSetor
          key={setorEditando?.id ?? 'novo'}
          aoFechar={fecharModal}
          setorEditando={setorEditando}
          podeRenomear={superadmin}
        />
      )}
    </div>
  )
}

export default PaginaSetores
