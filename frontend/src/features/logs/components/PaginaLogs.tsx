import { useMemo, useState } from 'react'
import Dropdown from '../../../shared/components/Dropdown'
import { IconeFunil, IconeLupa } from '../../../shared/components/icones'
import { useAtividades } from '../hooks/useAtividades'
import { ROTULO_AREA, type AreaAtividade } from '../types'
import TabelaAtividades from './TabelaAtividades'

const OPCOES_AREA = [
  { valor: '', rotulo: 'Todas as áreas' },
  ...(Object.entries(ROTULO_AREA) as [AreaAtividade, string][]).map(([valor, rotulo]) => ({ valor, rotulo })),
]

function PaginaLogs() {
  const { data: atividades = [], isLoading, isError } = useAtividades()

  const [busca, setBusca] = useState('')
  const [area, setArea] = useState<AreaAtividade | ''>('')

  const atividadesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return atividades.filter((atividade) => {
      if (area && atividade.area !== area) return false
      if (!termo) return true
      const texto = `${atividade.usuarioNome} ${atividade.acao} ${atividade.detalhe} ${ROTULO_AREA[atividade.area]}`
      return texto.toLowerCase().includes(termo)
    })
  }, [atividades, busca, area])

  return (
    <div>
      <h1 className="m-0 mb-[22px] text-2xl font-semibold tracking-tight text-slate-900 ios:font-display ios:text-3xl ios:font-bold">Registro de atividades</h1>

      <div className="mb-5 flex flex-wrap items-stretch gap-3 sm:gap-3.5">
        <label className="relative block w-full sm:w-auto sm:flex-[0_1_480px]">
          <IconeLupa
            tamanho={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-500 ios:left-4"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por usuário, ação ou área"
            aria-label="Buscar atividades"
            className="field h-full py-2.5 pl-[38px] text-[13.5px] ios:capsule-field ios:pl-10 ios:text-sm"
          />
        </label>

        <Dropdown
          rotuloPadrao="Área"
          icone={<IconeFunil tamanho={15} />}
          opcoes={OPCOES_AREA}
          valor={area}
          aoMudar={(v) => setArea(v as AreaAtividade | '')}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-600">Carregando registro de atividades…</p>
      ) : isError ? (
        <p className="text-sm text-critical">Não foi possível carregar o registro de atividades. Tente novamente.</p>
      ) : (
        <TabelaAtividades atividades={atividadesFiltradas} />
      )}
    </div>
  )
}

export default PaginaLogs
