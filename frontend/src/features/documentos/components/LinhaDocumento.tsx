import { IconeBaixar, IconeLapis, IconeLixeira, IconeOlho } from '../../../shared/components/icones'
import { coresExtensao, extensaoArquivo, formatarData } from '../formatadores'
import { ROTULOS_CATEGORIA, type Documento } from '../types'

interface PropriedadesLinhaDocumento {
  documento: Documento
  podeGerenciar: boolean
  aoVisualizar: () => void
  aoBaixar: () => void
  aoEditar: () => void
  aoExcluir: () => void
}

// Abaixo de md a linha vira card: documento em cima, categoria e data lado a
// lado, ações embaixo. O cabeçalho da tabela some nesse tamanho.
export const COLUNAS_TABELA =
  'md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.7fr)_200px] md:items-center md:gap-4'

function LinhaDocumento({
  documento,
  podeGerenciar,
  aoVisualizar,
  aoBaixar,
  aoEditar,
  aoExcluir,
}: PropriedadesLinhaDocumento) {
  const extensao = extensaoArquivo(documento.nomeArquivo)

  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 ${COLUNAS_TABELA} border-b border-slate-200/60 ios:border-slate-900/5 px-[18px] py-3.5 transition-colors last:border-b-0 hover:bg-white/60 ios:hover:bg-white/50`}
    >
      <div className="col-span-2 flex min-w-0 items-center gap-3.5 md:col-span-1">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold ios:rounded-[0.625rem] ${coresExtensao(extensao)}`}
        >
          {extensao}
        </span>
        <button
          type="button"
          onClick={aoVisualizar}
          title={documento.descricao ?? documento.nomeArquivo}
          className="min-w-0 cursor-pointer truncate text-left text-sm font-semibold text-slate-900 hover:text-brand-600 ios:text-[15px]"
        >
          {documento.titulo}
        </button>
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] text-slate-700">{ROTULOS_CATEGORIA[documento.categoria]}</span>
        <span className="truncate text-xs text-slate-500">{documento.setorNome}</span>
      </div>

      <span className="text-right text-xs text-slate-600 tabular-nums md:text-left">{formatarData(documento.atualizadoEm ?? documento.criadoEm)}</span>

      <div className="col-span-2 flex items-center justify-between border-t border-slate-200/60 ios:border-slate-900/5 pt-2.5 md:col-span-1 md:border-t-0 md:pt-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={aoVisualizar}
            title="Visualizar"
            aria-label="Visualizar"
            className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/70 hover:text-brand-600 md:size-8 ios:btn-icon"
          >
            <IconeOlho tamanho={15} />
          </button>
          {podeGerenciar && (
            <>
              <button
                type="button"
                onClick={aoEditar}
                title="Editar"
                aria-label="Editar"
                className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-700 md:size-8 ios:btn-icon"
              >
                <IconeLapis tamanho={15} />
              </button>
              <button
                type="button"
                onClick={aoExcluir}
                title="Excluir"
                aria-label="Excluir"
                className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-danger-50 hover:text-danger-600 md:size-8 ios:btn-icon is-danger"
              >
                <IconeLixeira tamanho={15} />
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={aoBaixar}
          className="btn btn-secondary min-h-10 px-3.5 text-[13px] text-brand-600 md:min-h-8"
        >
          <IconeBaixar tamanho={15} />
          Baixar
        </button>
      </div>
    </li>
  )
}

export default LinhaDocumento
