import Dropdown from '../../../shared/components/Dropdown'
import { IconeFunil, IconeLupa, IconeMais, IconePredio } from '../../../shared/components/icones'
import { ROTULO_CATEGORIA, type CategoriaAviso, type Setor } from '../types'

interface PropriedadesBarraFiltros {
  busca: string
  aoMudarBusca: (valor: string) => void
  categoria: CategoriaAviso | ''
  aoMudarCategoria: (valor: CategoriaAviso | '') => void
  setorId: string
  aoMudarSetor: (valor: string) => void
  setores: Setor[]
  podeCriar: boolean
  aoNovoAviso: () => void
}

const OPCOES_CATEGORIA = [
  { valor: '', rotulo: 'Todas as categorias' },
  ...(Object.entries(ROTULO_CATEGORIA) as [CategoriaAviso, string][]).map(([valor, rotulo]) => ({
    valor,
    rotulo,
  })),
]

function BarraFiltrosMural({
  busca,
  aoMudarBusca,
  categoria,
  aoMudarCategoria,
  setorId,
  aoMudarSetor,
  setores,
  podeCriar,
  aoNovoAviso,
}: PropriedadesBarraFiltros) {
  const opcoesSetor = [
    { valor: '', rotulo: 'Todos os setores' },
    ...setores.map((s) => ({ valor: s.id, rotulo: s.nome })),
  ]

  return (
    // `barra-filtros-fixa`: no iOS Glass, a partir de lg, fica presa ao topo (ver index.css).
    <div className="barra-filtros-fixa mb-5 flex flex-wrap items-stretch gap-3 sm:gap-3.5">
      <label className="relative block w-full sm:w-auto sm:flex-[0_1_320px]">
        <IconeLupa
          tamanho={16}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-500 ios:left-4"
        />
        <input
          value={busca}
          onChange={(e) => aoMudarBusca(e.target.value)}
          placeholder="Buscar aviso por título, autor ou conteúdo"
          className="field h-full py-2.5 pl-[38px] text-[13.5px] ios:capsule-field ios:pl-10 ios:text-sm"
        />
      </label>

      <Dropdown
        rotuloPadrao="Categoria"
        icone={<IconeFunil tamanho={15} />}
        opcoes={OPCOES_CATEGORIA}
        valor={categoria}
        aoMudar={(v) => aoMudarCategoria(v as CategoriaAviso | '')}
      />

      <Dropdown
        rotuloPadrao="Setor"
        icone={<IconePredio tamanho={15} />}
        opcoes={opcoesSetor}
        valor={setorId}
        aoMudar={aoMudarSetor}
      />

      {podeCriar && (
        <button
          type="button"
          onClick={aoNovoAviso}
          className="btn btn-primary w-full flex-none sm:ml-auto sm:w-auto"
        >
          <IconeMais tamanho={15} />
          Novo aviso
        </button>
      )}
    </div>
  )
}

export default BarraFiltrosMural
