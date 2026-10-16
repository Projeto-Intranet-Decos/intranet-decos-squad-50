import { useState } from 'react'
import { IconeLapis, IconeLixeira, IconeSetaExterna } from '../../../shared/components/icones'
import { useExcluirAtalho } from '../hooks/useExcluirAtalho'
import type { Atalho } from '../types'
import FormularioAtalho from './FormularioAtalho'

interface PropriedadesItemAtalho {
  atalho: Atalho
  recolhido: boolean
  gerenciavel: boolean
}

const CLASSE_ACAO =
  'flex h-6 w-6 flex-none items-center justify-center rounded-md text-slate-400 hover:bg-slate-200'

function ItemAtalho({ atalho, recolhido, gerenciavel }: PropriedadesItemAtalho) {
  const [editando, setEditando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const excluir = useExcluirAtalho()

  if (editando && !recolhido) {
    return <FormularioAtalho id={atalho.id} inicial={atalho} aoConcluir={() => setEditando(false)} />
  }

  if (confirmandoExclusao && !recolhido) {
    return (
      <div className="flex items-center gap-2 rounded-[10px] bg-red-50 px-3 py-2 text-[12.5px] text-slate-700">
        <span className="flex-1 truncate">
          Excluir <strong className="font-semibold">{atalho.titulo}</strong>?
        </span>
        <button
          type="button"
          autoFocus
          onClick={() => setConfirmandoExclusao(false)}
          className="rounded-md px-1.5 py-0.5 text-slate-500 hover:bg-white"
        >
          Não
        </button>
        <button
          type="button"
          disabled={excluir.isPending}
          onClick={() => excluir.mutate(atalho.id, { onError: () => setConfirmandoExclusao(false) })}
          className="rounded-md bg-[#800020] px-1.5 py-0.5 font-semibold text-white hover:bg-[#6a001a] disabled:opacity-60"
        >
          Sim
        </button>
      </div>
    )
  }

  return (
    <div className="group flex items-center rounded-[10px] hover:bg-slate-100">
      <a
        href={atalho.url}
        target="_blank"
        rel="noopener noreferrer"
        title={atalho.titulo}
        className={`flex min-w-0 flex-1 items-center gap-2.5 py-2.5 text-[13px] ${recolhido ? 'justify-center px-0' : 'px-3'} font-medium text-slate-600 no-underline group-hover:text-[#800020]`}
      >
        <IconeSetaExterna tamanho={15} className="flex-none text-slate-400" />
        {!recolhido && <span className="flex-1 truncate">{atalho.titulo}</span>}
      </a>
      {gerenciavel && !recolhido && (
        <div className="hidden flex-none items-center gap-0.5 pr-1.5 group-focus-within:flex group-hover:flex">
          <button
            type="button"
            onClick={() => setEditando(true)}
            title="Editar atalho"
            aria-label={`Editar ${atalho.titulo}`}
            className={`${CLASSE_ACAO} hover:text-slate-700`}
          >
            <IconeLapis tamanho={13} />
          </button>
          <button
            type="button"
            onClick={() => setConfirmandoExclusao(true)}
            title="Excluir atalho"
            aria-label={`Excluir ${atalho.titulo}`}
            className={`${CLASSE_ACAO} hover:text-[#800020]`}
          >
            <IconeLixeira tamanho={13} />
          </button>
        </div>
      )}
    </div>
  )
}

export default ItemAtalho
