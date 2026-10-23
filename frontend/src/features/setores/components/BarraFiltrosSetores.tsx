import { IconeLupa, IconeMais } from '../../../shared/components/icones'

interface PropriedadesBarraFiltrosSetores {
  busca: string
  aoMudarBusca: (valor: string) => void
  podeCriar: boolean
  aoNovoSetor: () => void
}

function BarraFiltrosSetores({
  busca,
  aoMudarBusca,
  podeCriar,
  aoNovoSetor,
}: PropriedadesBarraFiltrosSetores) {
  return (
    <div className="mb-5 flex flex-wrap items-stretch gap-3 sm:gap-3.5">
      <label className="relative block w-full sm:w-auto sm:flex-[0_1_430px]">
        <IconeLupa
          tamanho={16}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-500 liquido:left-4"
        />
        <input
          value={busca}
          onChange={(e) => aoMudarBusca(e.target.value)}
          placeholder="Buscar setor ou ramal"
          className="field h-full py-2.5 pl-[38px] text-[13.5px] liquido:capsule-field liquido:pl-10 liquido:text-sm"
        />
      </label>

      {podeCriar && (
        <button
          type="button"
          onClick={aoNovoSetor}
          className="btn btn-primary flex-1 sm:ml-auto sm:flex-none"
        >
          <IconeMais tamanho={15} />
          Novo setor
        </button>
      )}
    </div>
  )
}

export default BarraFiltrosSetores
