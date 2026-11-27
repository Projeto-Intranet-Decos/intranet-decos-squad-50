import Modal from '../../shared/components/Modal'
import { IconeArquivos, IconeMegafone } from '../../shared/components/icones'
import type { Novidade } from './useNovidades'

interface PropriedadesModalNovidades {
  /**
   * Fotografia da busca feita ao abrir: a lista continua aqui depois de marcada como vista
   * (GER-28). `null` enquanto a busca não volta.
   */
  itens: Novidade[] | null
  aoFechar: () => void
  aoAbrirItem: (item: Novidade) => void
}

const formatoQuando = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function ModalNovidades({ itens, aoFechar, aoAbrirItem }: PropriedadesModalNovidades) {
  return (
    <Modal aberto titulo="Novidades" aoFechar={aoFechar} largura="520px">
      {itens === null ? (
        <p role="status" className="m-0 py-8 text-center text-sm text-slate-600">Buscando novidades…</p>
      ) : itens.length === 0 ? (
        <p className="m-0 py-8 text-center text-sm text-slate-600">Nada novo desde a sua última visita.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {itens.map((item) => {
            const Icone = item.tipo === 'aviso' ? IconeMegafone : IconeArquivos
            return (
              <li key={item.chave}>
                <button
                  type="button"
                  onClick={() => aoAbrirItem(item)}
                  className="flex w-full items-start gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-white/70 liquido:rounded-inner"
                >
                  <span className="mt-0.5 flex size-8 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Icone tamanho={16} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-slate-900">{item.titulo}</span>
                    <span className="truncate text-xs text-slate-600">{item.detalhe}</span>
                  </span>
                  <time dateTime={item.quando} className="flex-none pt-0.5 text-[11px] text-slate-500 tabular-nums">
                    {formatoQuando.format(new Date(item.quando))}
                  </time>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}

export default ModalNovidades
