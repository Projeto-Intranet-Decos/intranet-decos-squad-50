import Modal from '../../../shared/components/Modal'
import { IconeBaixar } from '../../../shared/components/icones'
import { formatarData, formatarTamanho } from '../formatadores'
import { useBaixarVersao, useVersoesDocumento } from '../hooks/useVersoesDocumento'
import type { Documento } from '../types'

interface PropriedadesModalHistoricoVersoes {
  documento: Documento
  aoFechar: () => void
}

function ModalHistoricoVersoes({ documento, aoFechar }: PropriedadesModalHistoricoVersoes) {
  const { data: versoes = [], isLoading, isError } = useVersoesDocumento(documento.id, documento.versao)
  const baixarVersao = useBaixarVersao(documento.id)

  return (
    <Modal aberto titulo="Histórico de versões" aoFechar={aoFechar}>
      <p className="m-0 mb-4 text-sm font-semibold text-slate-900">{documento.titulo}</p>

      {isLoading ? (
        <p className="m-0 py-6 text-center text-sm text-slate-600">Carregando versões…</p>
      ) : isError ? (
        <p className="m-0 py-6 text-center text-sm text-critical">Não foi possível carregar o histórico. Tente novamente.</p>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {versoes.map((versao, indice) => (
            <li key={versao.numero} className="relative flex gap-3.5 pb-5 last:pb-0">
              {indice < versoes.length - 1 && (
                <span aria-hidden="true" className="absolute top-4 bottom-0 left-[4.5px] w-px bg-slate-200" />
              )}
              <span
                aria-hidden="true"
                className={`relative mt-1.5 size-2.5 flex-none rounded-full ${indice === 0 ? 'bg-brand-600' : 'bg-slate-300'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">Versão {versao.numero}</span>
                  {indice === 0 && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 ring-1 ring-brand-100">
                      Atual
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => baixarVersao.mutate(versao)}
                    disabled={baixarVersao.isPending}
                    title={`Baixar versão ${versao.numero}`}
                    aria-label={`Baixar versão ${versao.numero}`}
                    className="ml-auto flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/70 hover:text-brand-600 disabled:opacity-50"
                  >
                    <IconeBaixar tamanho={15} />
                  </button>
                </div>
                {versao.alteracao && <p className="m-0 mt-1 text-[13px] text-slate-700">{versao.alteracao}</p>}
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {formatarData(versao.criadoEm)} · {versao.autorNome} · {versao.nomeArquivo} ({formatarTamanho(versao.tamanhoBytes)})
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}

export default ModalHistoricoVersoes
