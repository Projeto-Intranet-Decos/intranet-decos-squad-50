import Modal from '../../../shared/components/Modal'
import { formatarData, formatarTamanho } from '../formatadores'
import type { VersaoDocumento } from '../prototipoVersoes'
import type { Documento } from '../types'

interface PropriedadesModalHistoricoVersoes {
  documento: Documento
  versoes: VersaoDocumento[]
  aoFechar: () => void
}

function ModalHistoricoVersoes({ documento, versoes, aoFechar }: PropriedadesModalHistoricoVersoes) {
  return (
    <Modal aberto titulo="Histórico de versões" aoFechar={aoFechar}>
      <p className="m-0 mb-4 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning ring-1 ring-warning/20">
        Protótipo: as versões abaixo são fictícias, só para validar a ideia com o time (DOC-09).
      </p>
      <p className="m-0 mb-4 text-sm font-semibold text-slate-900">{documento.titulo}</p>

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
              </div>
              <p className="m-0 mt-1 text-[13px] text-slate-700">{versao.alteracao}</p>
              <p className="m-0 mt-1 text-xs text-slate-500">
                {formatarData(versao.data)} · {versao.autorNome} · {versao.nomeArquivo} ({formatarTamanho(versao.tamanhoBytes)})
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  )
}

export default ModalHistoricoVersoes
