import { useMemo, useState } from 'react'
import Dropdown from '../../../shared/components/Dropdown'
import { IconeFunil, IconeLupa } from '../../../shared/components/icones'
import { useOrdenacaoClique } from '../../../shared/hooks/useOrdenacaoClique'
import { useAtividades } from '../hooks/useAtividades'
import { ROTULO_AREA, type AreaAtividade, type Atividade, type ColunaAtividade } from '../types'
import TabelaAtividades from './TabelaAtividades'

const OPCOES_AREA = [
  { valor: '', rotulo: 'Todas as áreas' },
  ...(Object.entries(ROTULO_AREA) as [AreaAtividade, string][]).map(([valor, rotulo]) => ({ valor, rotulo })),
]

function compararAtividades(a: Atividade, b: Atividade, coluna: ColunaAtividade): number {
  switch (coluna) {
    case 'usuario':
      return a.usuarioNome.localeCompare(b.usuarioNome, 'pt-BR')
    case 'acao':
      return a.acao.localeCompare(b.acao, 'pt-BR')
    case 'area':
      return ROTULO_AREA[a.area].localeCompare(ROTULO_AREA[b.area], 'pt-BR')
    default:
      return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()
  }
}

function PaginaLogs() {
  const { data: atividades = [], isLoading, isError } = useAtividades()

  const [busca, setBusca] = useState('')
  const [area, setArea] = useState<AreaAtividade | ''>('')
  const { coluna: ordenarPor, direcao, aoClicarColuna } = useOrdenacaoClique<ColunaAtividade>('data', 'desc')

  const atividadesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const filtradas = atividades.filter((atividade) => {
      if (area && atividade.area !== area) return false
      if (!termo) return true
      const texto = `${atividade.usuarioNome} ${atividade.acao} ${atividade.detalhe} ${ROTULO_AREA[atividade.area]}`
      return texto.toLowerCase().includes(termo)
    })
    return [...filtradas].sort((a, b) => {
      const resultado = compararAtividades(a, b, ordenarPor)
      return direcao === 'desc' ? -resultado : resultado
    })
  }, [atividades, busca, area, ordenarPor, direcao])

  return (
    <div>
      <h1 className="m-0 mb-[22px] text-2xl font-semibold tracking-tight text-slate-900 liquido:font-display liquido:text-3xl liquido:font-bold">Registro de atividades</h1>

      <div className="mb-5 flex flex-wrap items-stretch gap-3 sm:gap-3.5">
        <label className="relative block w-full sm:w-auto sm:flex-[0_1_480px]">
          <IconeLupa
            tamanho={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-500 liquido:left-4"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por usuário, ação ou área"
            aria-label="Buscar atividades"
            className="field h-full py-2.5 pl-[38px] text-[13.5px] liquido:capsule-field liquido:pl-10 liquido:text-sm"
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

      {isError ? (
        <p className="text-sm text-critical">Não foi possível carregar o registro de atividades. Tente novamente.</p>
      ) : (
        <TabelaAtividades atividades={atividadesFiltradas} isLoading={isLoading} ordenarPor={ordenarPor} direcao={direcao} aoClicarColuna={aoClicarColuna} />
      )}
    </div>
  )
}

export default PaginaLogs
