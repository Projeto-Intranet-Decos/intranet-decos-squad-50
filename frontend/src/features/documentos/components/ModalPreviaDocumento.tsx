import Botao from '../../../shared/components/Botao'
import Modal from '../../../shared/components/Modal'
import { IconeAlerta, IconeBaixar } from '../../../shared/components/icones'
import { formatarTamanho } from '../formatadores'
import { useBaixarDocumento } from '../hooks/useBaixarDocumento'
import { usePreviaDocumento } from '../hooks/usePreviaDocumento'
import type { Documento } from '../types'

interface PropriedadesModalPreviaDocumento {
  documento: Documento
  aoFechar: () => void
}

function ModalPreviaDocumento({ documento, aoFechar }: PropriedadesModalPreviaDocumento) {
  const { tipo, url, isLoading, isError } = usePreviaDocumento(documento)
  const baixarDocumento = useBaixarDocumento()

  function conteudo() {
    if (tipo === 'nenhum') {
      return (
        <AvisoPrevia
          titulo="Pré-visualização indisponível"
          texto="O navegador não consegue exibir este tipo de arquivo. Baixe para abrir no seu computador."
        />
      )
    }
    if (isLoading) return <p className="m-0 py-16 text-center text-sm text-slate-600">Carregando arquivo…</p>
    if (isError || !url) {
      return <AvisoPrevia titulo="Não foi possível carregar o arquivo" texto="Tente novamente ou baixe o arquivo." />
    }
    if (tipo === 'imagem') {
      return (
        <div className="flex justify-center rounded-[10px] ios:rounded-inner bg-white/55 p-4 ring-1 ring-white/80">
          <img src={url} alt={documento.titulo} className="max-h-[65vh] max-w-full object-contain" />
        </div>
      )
    }
    return (
      <iframe
        src={url}
        title={documento.titulo}
        className={`h-[60vh] w-full rounded-[10px] ios:rounded-inner border border-slate-200/60 ios:border-slate-900/5 sm:h-[70vh] ${tipo === 'texto' ? 'bg-white' : ''}`}
      />
    )
  }

  return (
    <Modal aberto titulo={documento.titulo} aoFechar={aoFechar} largura="960px">
      {conteudo()}

      <div className="mt-[18px] flex flex-col items-stretch justify-between gap-2.5 border-t border-slate-200/60 ios:border-slate-900/5 pt-[18px] sm:flex-row sm:items-center">
        <span className="truncate text-[13px] text-slate-600">
          {documento.nomeArquivo} · {formatarTamanho(documento.tamanhoBytes)}
        </span>
        <Botao
          variante="primario"
          onClick={() => baixarDocumento.mutate({ documento })}
          disabled={baixarDocumento.isPending}
          className="flex-none"
        >
          <IconeBaixar tamanho={15} />
          {baixarDocumento.isPending ? 'Baixando…' : 'Baixar'}
        </Botao>
      </div>
    </Modal>
  )
}

function AvisoPrevia({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[10px] ios:rounded-inner bg-amber-50/90 px-6 py-12 text-center ring-1 ring-amber-200">
      <IconeAlerta tamanho={28} className="text-warning" />
      <span className="text-[15px] font-semibold text-slate-900">{titulo}</span>
      <span className="max-w-md text-[13px] text-slate-700">{texto}</span>
    </div>
  )
}

export default ModalPreviaDocumento
