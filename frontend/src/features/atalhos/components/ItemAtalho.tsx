import { useState } from 'react'
import { IconeLapis, IconeLixeira, IconeSetaExterna } from '../../../shared/components/icones'
import { useExcluirAtalho } from '../hooks/useExcluirAtalho'
import type { Atalho } from '../types'
import FormularioAtalho from './FormularioAtalho'

interface PropriedadesItemAtalho {
  atalho: Atalho
  compacto: boolean
  gerenciavel: boolean
  aoNavegar: () => void
}

const CLASSE_ACAO =
  'flex size-8 flex-none items-center justify-center rounded-lg text-slate-500 transition-[color,background-color,scale] lg:size-7 liquido:rounded-full liquido:active:scale-[0.94]'

const CLASSE_BOTAO_CONFIRMACAO =
  'min-h-8 rounded-md px-2.5 font-medium transition-colors lg:min-h-7 lg:px-2 liquido:rounded-full disabled:opacity-60'

function ItemAtalho({ atalho, compacto, gerenciavel, aoNavegar }: PropriedadesItemAtalho) {
  const [editando, setEditando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const excluir = useExcluirAtalho()

  if (editando && !compacto) {
    return <FormularioAtalho id={atalho.id} inicial={atalho} aoConcluir={() => setEditando(false)} />
  }

  if (confirmandoExclusao && !compacto) {
    return (
      <div className="flex items-center gap-1.5 rounded-[10px] bg-danger-50/90 py-1.5 pr-1.5 pl-3 text-[13px] text-slate-700 ring-1 ring-red-200/70 liquido:rounded-2xl liquido:pl-3.5">
        <span className="flex-1 truncate">
          Excluir <strong className="font-semibold text-slate-900">{atalho.titulo}</strong>?
        </span>
        <button
          type="button"
          autoFocus
          onClick={() => setConfirmandoExclusao(false)}
          className={`${CLASSE_BOTAO_CONFIRMACAO} text-slate-600 hover:bg-white/80 hover:text-slate-900`}
        >
          Não
        </button>
        <button
          type="button"
          disabled={excluir.isPending}
          onClick={() => excluir.mutate(atalho.id, { onError: () => setConfirmandoExclusao(false) })}
          className={`${CLASSE_BOTAO_CONFIRMACAO} bg-danger-600 font-semibold text-white hover:bg-red-700`}
        >
          Sim
        </button>
      </div>
    )
  }

  return (
    <div className="group flex min-h-10 items-center rounded-[10px] transition-colors hover:bg-white/60 liquido:rounded-full liquido:hover:bg-white/50">
      <a
        href={atalho.url}
        target="_blank"
        rel="noopener noreferrer"
        title={atalho.titulo}
        onClick={aoNavegar}
        className={`flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-[10px] py-2.5 text-[13.5px] ${compacto ? 'justify-center px-0' : 'px-3 liquido:px-3.5'} font-medium text-slate-600 no-underline transition-[color,scale] group-hover:text-brand-600 liquido:rounded-full liquido:text-[15px] liquido:text-slate-700 liquido:active:scale-[0.98]`}
      >
        <IconeSetaExterna tamanho={16} className="flex-none text-slate-500 liquido:size-[18px]" />
        {!compacto && <span className="flex-1 truncate">{atalho.titulo}</span>}
      </a>
      {gerenciavel && !compacto && (
        // No toque (drawer) não há hover: os botões ficam sempre à mostra abaixo de lg.
        <div className="flex flex-none items-center gap-0.5 pr-1 lg:hidden lg:group-focus-within:flex lg:group-hover:flex">
          <button
            type="button"
            onClick={() => setEditando(true)}
            title="Editar atalho"
            aria-label={`Editar ${atalho.titulo}`}
            className={`${CLASSE_ACAO} hover:bg-white/80 hover:text-slate-700`}
          >
            <IconeLapis tamanho={14} />
          </button>
          <button
            type="button"
            onClick={() => setConfirmandoExclusao(true)}
            title="Excluir atalho"
            aria-label={`Excluir ${atalho.titulo}`}
            className={`${CLASSE_ACAO} hover:bg-danger-50 hover:text-danger-600`}
          >
            <IconeLixeira tamanho={14} />
          </button>
        </div>
      )}
    </div>
  )
}

export default ItemAtalho
