import { useNavigate } from 'react-router-dom'
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
import { chaveDiaDeIso } from '../formatadoresCalendario'
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
  const navegar = useNavigate()

  if (!aviso) return null

  // Só evento tem data: abre o calendário nela, com o dia destacado (MUR-15).
  const dataNoCalendario = aviso.categoria === 'evento' && aviso.dataInicio ? chaveDiaDeIso(aviso.dataInicio) : null

  function verNoCalendario() {
    aoFechar()
    navegar(`/calendario?data=${dataNoCalendario}`)
  }

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
          <span className="flex size-[38px] flex-none items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <IconeUsuario tamanho={22} />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900 liquido:text-[15px]">{aviso.autorNome}</span>
            <span className="text-xs text-slate-500 liquido:text-sm">{aviso.setorNome}</span>
          </div>
        </div>
      }
    >
      <div className="mb-4 h-0.5 rounded-full bg-brand-600 liquido:hidden" />
      <div className="mb-2.5 flex flex-wrap items-center gap-3">
        <span className="text-xs tracking-wide text-slate-500 tabular-nums liquido:text-sm liquido:tracking-normal">
          {formatarDiaMes(aviso.criadoEm)} · {formatarHora(aviso.criadoEm)}
        </span>
        <BadgeCategoria categoria={aviso.categoria} comImagem={!!aviso.urlImagem} />
      </div>
      <div className="flex flex-col items-start gap-6 md:flex-row">
        {aviso.urlImagem && (
          <div className="w-full flex-none rounded-[10px] liquido:rounded-inner bg-white/55 p-2 ring-1 ring-white/80 md:w-[400px]">
            <div
              className="h-[220px] w-full rounded-md bg-cover bg-center sm:h-[300px] liquido:rounded-lg"
              style={{ backgroundImage: `url(${aviso.urlImagem})` }}
            />
          </div>
        )}
        <div className="w-full min-w-0 flex-1">
          <h2 className="m-0 mb-4 text-xl leading-tight font-semibold tracking-tight text-balance text-slate-900 sm:text-[26px] liquido:font-display liquido:font-bold sm:liquido:text-3xl">
            {aviso.titulo}
          </h2>
          {aviso.dataInicio && (
            <p className="m-0 mb-4 flex items-center gap-2 text-sm font-medium text-brand-600 tabular-nums">
              <IconeCalendario tamanho={18} />
              {formatarPeriodoEvento(aviso.dataInicio, aviso.dataFim)}
            </p>
          )}
          <div className="mb-4 h-px bg-slate-200/60" />
          {aviso.conteudo && (
            <p className="m-0 text-[15px] leading-loose text-balance whitespace-pre-line text-slate-700">
              {aviso.conteudo}
            </p>
          )}
          {aviso.anexos.length > 0 && (
            <div className="mt-6 flex flex-col gap-2">
              <span className="text-xs font-medium tracking-wide text-slate-700 uppercase liquido:text-sm liquido:font-semibold liquido:tracking-normal liquido:normal-case">Anexos</span>
              {aviso.anexos.map((anexo) => (
                <div
                  key={anexo.id}
                  className="flex items-center gap-2.5 rounded-[10px] liquido:rounded-inner bg-white/55 px-3 py-1.5 ring-1 ring-white/80"
                >
                  <IconeArquivoTexto tamanho={16} className="flex-none text-brand-600" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-800">
                    {anexo.nome}
                  </span>
                  <span className="text-xs text-slate-600 tabular-nums">{anexo.tamanho}</span>
                  <button
                    type="button"
                    onClick={() => baixar(anexo.id, anexo.nome)}
                    title="Baixar"
                    className="flex size-10 flex-none items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/60 hover:text-brand-600 sm:size-8 liquido:btn-icon"
                  >
                    <IconeDownload tamanho={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-auto grid gap-3 border-t border-slate-200/60 liquido:border-slate-900/5 pt-6 sm:flex sm:items-center">
        {aoExcluir && (
          <Botao variante="perigo" onClick={() => aoExcluir(aviso)}>
            Excluir
          </Botao>
        )}
        {aoEditar && (
          <Botao variante="secundario" onClick={() => aoEditar(aviso)}>
            Editar
          </Botao>
        )}
        {dataNoCalendario && (
          <Botao variante="secundario" onClick={verNoCalendario} className="sm:ml-auto">
            <IconeCalendario tamanho={16} />
            Ver no calendário
          </Botao>
        )}
        <Botao variante="secundario" onClick={aoFechar} className={dataNoCalendario ? '' : 'sm:ml-auto'}>
          Fechar
        </Botao>
      </div>
    </Modal>
  )
}

export default ModalDetalheAviso
