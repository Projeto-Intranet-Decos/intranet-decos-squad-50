import Botao from '../../../shared/components/Botao'
import Modal from '../../../shared/components/Modal'
import { IconeAlerta } from '../../../shared/components/icones'
import { useExcluirDocumento } from '../hooks/useExcluirDocumento'
import type { Documento } from '../types'

interface PropriedadesModalExcluirDocumento {
  documento: Documento
  aoFechar: () => void
}

function ModalExcluirDocumento({ documento, aoFechar }: PropriedadesModalExcluirDocumento) {
  const excluirDocumento = useExcluirDocumento()
  const excluindo = excluirDocumento.isPending

  return (
    // Fechar no meio do DELETE não cancela a requisição; trava pra não sumir o feedback.
    <Modal aberto titulo="Excluir documento" aoFechar={() => !excluindo && aoFechar()} largura="460px">
      <div className="flex gap-3.5">
        <span className="flex size-10 flex-none items-center justify-center rounded-full bg-danger-50 text-danger-600 ring-1 ring-red-200">
          <IconeAlerta tamanho={20} />
        </span>
        <div className="min-w-0 text-sm text-slate-700">
          <p className="m-0">Tem certeza que deseja excluir este documento?</p>
          <p className="m-0 mt-2 truncate font-semibold text-slate-900" title={documento.nomeArquivo}>
            {documento.titulo}
          </p>
          <p className="m-0 truncate text-[13px] text-slate-500">{documento.nomeArquivo}</p>
          <p className="m-0 mt-3 text-[13px] text-critical">Essa ação não pode ser desfeita.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-2.5 border-t border-slate-200/60 ios:border-slate-900/5 pt-[18px] sm:flex sm:justify-end">
        <Botao variante="secundario" onClick={aoFechar} disabled={excluindo}>
          Cancelar
        </Botao>
        <Botao
          variante="perigo"
          onClick={() => excluirDocumento.mutate(documento.id, { onSuccess: aoFechar })}
          disabled={excluindo}
        >
          {excluindo ? 'Excluindo…' : 'Excluir documento'}
        </Botao>
      </div>
    </Modal>
  )
}

export default ModalExcluirDocumento
