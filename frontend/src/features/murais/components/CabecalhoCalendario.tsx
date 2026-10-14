import Botao from '../../../shared/components/Botao'
import { IconeCaretLeft, IconeCaretRight } from '../../../shared/components/icones'
import type { VisaoCalendario } from '../types'

const VISOES: { valor: VisaoCalendario; rotulo: string }[] = [
  { valor: 'dia', rotulo: 'Dia' },
  { valor: 'semana', rotulo: 'Semana' },
  { valor: 'mes', rotulo: 'Mês' },
  { valor: 'ano', rotulo: 'Ano' },
]

interface PropriedadesCabecalhoCalendario {
  titulo: string
  visao: VisaoCalendario
  aoMudarVisao: (visao: VisaoCalendario) => void
  aoAnterior: () => void
  aoProximo: () => void
}

function CabecalhoCalendario({ titulo, visao, aoMudarVisao, aoAnterior, aoProximo }: PropriedadesCabecalhoCalendario) {
  return (
    <div className="mb-[18px] flex flex-wrap items-center gap-3.5">
      <h2 className="m-0 text-[17px] font-bold text-slate-900">{titulo}</h2>
      <div className="ml-auto flex gap-[3px] rounded-[10px] bg-slate-50 p-[3px]">
        {VISOES.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => aoMudarVisao(opcao.valor)}
            className={`cursor-pointer rounded-[10px] px-[13px] py-1.5 text-xs font-medium transition-colors ${
              opcao.valor === visao ? 'bg-white text-[#3b000e]' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Botao variante="icone" onClick={aoAnterior} title="Período anterior" className="h-[30px] w-[30px] border border-slate-200">
          <IconeCaretLeft tamanho={15} />
        </Botao>
        <Botao variante="icone" onClick={aoProximo} title="Próximo período" className="h-[30px] w-[30px] border border-slate-200">
          <IconeCaretRight tamanho={15} />
        </Botao>
      </div>
    </div>
  )
}

export default CabecalhoCalendario
