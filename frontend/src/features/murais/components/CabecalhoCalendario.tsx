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
      <h2 className="m-0 w-full text-base font-semibold text-slate-900 sm:w-auto ios:text-lg ios:tracking-tight">{titulo}</h2>
      <div className="flex gap-[3px] rounded-[10px] bg-slate-900/5 p-[3px] sm:ml-auto ios:rounded-full ios:p-1">
        {VISOES.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => aoMudarVisao(opcao.valor)}
            className={`min-h-10 cursor-pointer rounded-lg px-[13px] py-1.5 text-[13px] font-medium transition-colors sm:min-h-0 ios:rounded-full ios:px-3.5 ios:text-sm max-lg:ios:min-h-11 ${
              opcao.valor === visao ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>
      <div className="ml-auto flex gap-1.5 sm:ml-0">
        <Botao variante="icone" onClick={aoAnterior} title="Período anterior" className="border border-slate-300/90 bg-white/70 sm:size-[30px]">
          <IconeCaretLeft tamanho={15} />
        </Botao>
        <Botao variante="icone" onClick={aoProximo} title="Próximo período" className="border border-slate-300/90 bg-white/70 sm:size-[30px]">
          <IconeCaretRight tamanho={15} />
        </Botao>
      </div>
    </div>
  )
}

export default CabecalhoCalendario
