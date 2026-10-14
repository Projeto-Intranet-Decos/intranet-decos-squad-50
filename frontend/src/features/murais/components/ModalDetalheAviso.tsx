import { toast } from 'sonner'
import Botao from '../../../shared/components/Botao'
import Modal from '../../../shared/components/Modal'
import {
  IconeArquivoTexto,
  IconeCalendario,
  IconeDownload,
  IconeUsuario,
} from '../../../shared/components/icones'
import { baixarAnexoAviso } from '../api'
import { formatarDiaMes, formatarHora, formatarPeriodoEvento } from '../formatadores'
import BadgeCategoria from './BadgeCategoria'
import type { Aviso } from '../types'

interface PropriedadesModalDetalheAviso {
  aviso: Aviso | null
  aoFechar: () => void
  /** Só passados quando o usuário pode gerenciar este aviso (GER-12). */
  aoEditar?: (aviso: Aviso) => void
  aoExcluir?: (aviso: Aviso) => void
}

function ModalDetalheAviso({ aviso, aoFechar, aoEditar, aoExcluir }: PropriedadesModalDetalheAviso) {
  if (!aviso) return null

  async function baixar(anexoId: string, nome: string) {
    if (!aviso) return
    try {
      await baixarAnexoAviso(aviso.id, anexoId, nome)
    } catch {
      toast.error('Não foi possível baixar o anexo. Tente novamente.')
    }
  }

  return (
    <Modal
      aberto
      titulo={aviso.titulo}
      aoFechar={aoFechar}
      largura="1000px"
      variante="amplo"
      cabecalho={
        <div className="flex items-center gap-3">
          <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-slate-300 text-white">
            <IconeUsuario tamanho={22} />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">{aviso.autorNome}</span>
            <span className="text-xs text-slate-500">{aviso.setorNome}</span>
          </div>
        </div>
      }
    >
      <div className="mb-4 h-0.5 rounded-full bg-[#800020]" />
      <div className="mb-2.5 flex items-center gap-3">
        <span className="text-[11px] tracking-wide text-slate-400">
          {formatarDiaMes(aviso.criadoEm)} · {formatarHora(aviso.criadoEm)}
        </span>
        <BadgeCategoria categoria={aviso.categoria} comImagem={!!aviso.urlImagem} />
      </div>
      <div className="flex items-start gap-6">
        {aviso.urlImagem && (
          <div className="w-[400px] flex-none rounded-[10px] border border-slate-200 bg-slate-50 p-2">
            <div
              className="h-[300px] w-full rounded-md bg-cover bg-center"
              style={{ backgroundImage: `url(${aviso.urlImagem})` }}
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="m-0 mb-4 text-[26px] leading-tight font-bold tracking-tight text-slate-900 text-balance">
            {aviso.titulo}
          </h2>
          {aviso.dataInicio && (
            <p className="m-0 mb-4 flex items-center gap-2 text-[14px] font-medium text-[#800020]">
              <IconeCalendario tamanho={16} />
              {formatarPeriodoEvento(aviso.dataInicio, aviso.dataFim)}
            </p>
          )}
          <div className="mb-4 h-px bg-slate-200" />
          {aviso.conteudo && (
            <p className="m-0 text-[15px] leading-loose text-slate-700 text-balance whitespace-pre-line">
              {aviso.conteudo}
            </p>
          )}
          {aviso.anexos.length > 0 && (
            <div className="mt-6 flex flex-col gap-2">
              <span className="text-[11px] tracking-wide text-slate-500">ANEXOS</span>
              {aviso.anexos.map((anexo) => (
                <div
                  key={anexo.id}
                  className="flex items-center gap-2.5 rounded-lg bg-slate-100 px-3 py-2.5"
                >
                  <IconeArquivoTexto tamanho={16} className="text-[#800020]" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-slate-800">
                    {anexo.nome}
                  </span>
                  <span className="text-[11px] text-slate-500">{anexo.tamanho}</span>
                  <button
                    type="button"
                    onClick={() => baixar(anexo.id, anexo.nome)}
                    title="Baixar"
                    className="flex text-slate-400 hover:text-[#800020]"
                  >
                    <IconeDownload tamanho={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-auto flex items-center gap-3 border-t border-slate-100 pt-6">
        {aoExcluir && (
          <Botao variante="secundario" onClick={() => aoExcluir(aviso)}>
            Excluir
          </Botao>
        )}
        {aoEditar && (
          <Botao variante="secundario" onClick={() => aoEditar(aviso)}>
            Editar
          </Botao>
        )}
        <Botao variante="secundario" onClick={aoFechar} className="ml-auto">
          Fechar
        </Botao>
      </div>
    </Modal>
  )
}

export default ModalDetalheAviso
