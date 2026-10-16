import { useEffect, useRef, useState } from 'react'
import { IconeCaretDown } from './icones'

interface OpcaoDropdown {
  valor: string
  rotulo: string
}

interface PropriedadesDropdown {
  rotuloPadrao: string
  icone?: React.ReactNode
  opcoes: OpcaoDropdown[]
  valor: string
  aoMudar: (valor: string) => void
  valorPadrao?: string
}

// Dropdown de filtro
function Dropdown({ rotuloPadrao, icone, opcoes, valor, aoMudar, valorPadrao = '' }: PropriedadesDropdown) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [])

  const opcaoAtual = opcoes.find((o) => o.valor === valor)
  const ativo = valor !== valorPadrao
  const rotulo = ativo && opcaoAtual ? opcaoAtual.rotulo : rotuloPadrao

  return (
    <div ref={ref} className="relative flex-1 sm:flex-none">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className={`btn btn-secondary h-full w-full px-3.5 text-sm sm:w-auto liquido:capsule-field liquido:px-4 ${ativo ? 'text-brand-600 liquido:font-semibold' : 'text-slate-600 liquido:text-slate-700'}`}
      >
        {icone}
        {rotulo}
        <IconeCaretDown tamanho={14} className="text-slate-500" />
      </button>
      {aberto && (
        <div className="glass absolute top-[calc(100%+6px)] left-0 z-30 flex max-h-[min(360px,60dvh)] min-w-full sm:min-w-[190px] flex-col overflow-y-auto rounded-xl p-1.5 liquido:rounded-[1.25rem]">
          {opcoes.map((o) => (
            <button
              key={o.valor}
              type="button"
              onClick={() => {
                aoMudar(o.valor)
                setAberto(false)
              }}
              className={`min-h-10 rounded-lg px-2.5 py-2 text-left text-sm transition-colors sm:min-h-0 liquido:rounded-[0.875rem] liquido:px-3 max-lg:liquido:min-h-11 ${
                o.valor === valor
                  ? 'bg-brand-50 font-semibold text-brand-700 liquido:bg-brand-600/10'
                  : 'font-medium text-slate-700 hover:bg-white/60'
              }`}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dropdown
