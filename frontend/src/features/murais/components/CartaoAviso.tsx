import { IconeCalendario, IconeLapis, IconeLixeira, IconeUsuario } from '../../../shared/components/icones'
import { formatarHora, formatarPeriodoEvento } from '../formatadores'
import BadgeCategoria from './BadgeCategoria'
import type { Aviso } from '../types'

interface PropriedadesCartaoAviso {
  aviso: Aviso
  diaTexto: string
  corPonto: string
  podeGerenciar: boolean
  aoAbrir: () => void
  aoEditar: (e: React.MouseEvent) => void
  aoExcluir: (e: React.MouseEvent) => void
}

function CartaoAviso({
  aviso,
  diaTexto,
  corPonto,
  podeGerenciar,
  aoAbrir,
  aoEditar,
  aoExcluir,
}: PropriedadesCartaoAviso) {
  return (
    <div className="grid grid-cols-[88px_26px_minmax(0,1fr)] items-start">
      <div className="flex flex-col gap-0.5 pt-3.5 pr-0.5 text-right">
        {diaTexto && <span className="text-xs font-medium text-slate-800">{diaTexto}</span>}
        <span className="text-[10px] tracking-wide text-slate-400">{formatarHora(aviso.criadoEm)}</span>
      </div>
      <div className="relative flex justify-center self-stretch">
        <div className="absolute top-0 -bottom-[26px] w-px bg-slate-200" />
        <div
          className="relative mt-[18px] h-2.5 w-2.5 rounded-full"
          style={{ background: corPonto, boxShadow: '0 0 0 4px #f8fafc' }}
        />
      </div>
      <article
        onClick={aoAbrir}
        className="cursor-pointer rounded-[10px] bg-white p-5 shadow-[0_1px_2px_rgba(30,42,50,0.04),0_10px_22px_-16px_rgba(30,42,50,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(30,42,50,0.06),0_18px_34px_-18px_rgba(30,42,50,0.32)]"
      >
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-slate-300 text-white">
            <IconeUsuario tamanho={17} />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold text-slate-900">{aviso.autorNome}</span>
            <span className="text-[11.5px] text-slate-500">{aviso.setorNome}</span>
          </div>
          <BadgeCategoria
            categoria={aviso.categoria}
            comImagem={!!aviso.urlImagem}
            className="ml-auto"
          />
        </div>
        <div className="mb-3.5 h-0.5 rounded-full bg-[#800020]" />
        {aviso.urlImagem && (
          <div className="mb-3.5 rounded-[10px] border border-slate-200 bg-slate-50 p-1.5">
            <div
              className="h-[190px] w-full rounded-md bg-cover bg-center"
              style={{ backgroundImage: `url(${aviso.urlImagem})` }}
            />
          </div>
        )}
        <h3 className="m-0 mb-3 text-lg leading-snug font-bold tracking-tight text-slate-900">
          {aviso.titulo}
        </h3>
        {aviso.dataInicio && (
          <p className="m-0 mb-3 flex items-center gap-1.5 text-[12.5px] font-medium text-[#800020]">
            <IconeCalendario tamanho={14} />
            {formatarPeriodoEvento(aviso.dataInicio, aviso.dataFim)}
          </p>
        )}
        {aviso.conteudo && (
          <>
            <div className="mb-3 h-px bg-slate-200" />
            <p className="m-0 line-clamp-3 text-[13.5px] leading-relaxed text-slate-600 text-balance">
              {aviso.conteudo}
            </p>
          </>
        )}
        {podeGerenciar && (
          <div className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3.5">
            <div className="ml-auto flex gap-1">
              <button
                type="button"
                onClick={aoEditar}
                title="Editar"
                className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <IconeLapis tamanho={15} />
              </button>
              <button
                type="button"
                onClick={aoExcluir}
                title="Excluir"
                className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <IconeLixeira tamanho={15} />
              </button>
            </div>
          </div>
        )}
      </article>
    </div>
  )
}

export default CartaoAviso
