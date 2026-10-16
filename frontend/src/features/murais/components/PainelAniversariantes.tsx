import { IconeUsuario, IconeUsuarios } from '../../../shared/components/icones'
import { NOMES_MESES } from '../formatadores'
import type { Aniversariante } from '../types'

interface PropriedadesPainelAniversariantes {
  mes: number
  aniversariantes: Aniversariante[]
}

function PainelAniversariantes({ mes, aniversariantes }: PropriedadesPainelAniversariantes) {
  const ordenados = [...aniversariantes].sort((a, b) => a.dia - b.dia)

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden surface">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 bg-white/40 px-[18px] py-3 liquido:border-slate-900/5 liquido:bg-transparent liquido:px-5 liquido:pt-4 liquido:pb-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-600 liquido:gap-2 uppercase liquido:text-[15px] liquido:tracking-normal liquido:normal-case liquido:text-slate-900 liquido:[&_svg]:size-[18px]">
          <IconeUsuarios tamanho={16} className="text-brand-600" />
          Aniversariantes de {NOMES_MESES[mes - 1].toLowerCase()}
        </span>
        <span className="flex-none text-[11px] text-slate-500 tabular-nums uppercase liquido:text-sm liquido:normal-case">
          {ordenados.length} pessoas
        </span>
      </div>
      <div className="flex flex-col px-[18px] pb-[18px] liquido:px-5 liquido:pb-3">
        {ordenados.length === 0 && (
          <p className="m-0 py-6 text-center text-[13px] text-slate-600 liquido:text-sm liquido:text-slate-500">
            Nenhum aniversariante neste mês.
          </p>
        )}
        {ordenados.map((pessoa) => (
          <div
            key={pessoa.id}
            className="relative flex items-center gap-[11px] border-t border-slate-200/60 py-2.5 first:border-t-0 liquido:gap-3 liquido:border-t-0 liquido:[&+&]:before:absolute liquido:[&+&]:before:top-0 liquido:[&+&]:before:right-0 liquido:[&+&]:before:left-12 liquido:[&+&]:before:border-t liquido:[&+&]:before:border-slate-900/5"
          >
            <span className="flex size-[34px] flex-none items-center justify-center rounded-full bg-brand-100 text-brand-700 liquido:size-9">
              <IconeUsuario tamanho={19} />
            </span>
            <div className="flex min-w-0 flex-col leading-snug">
              <span className="truncate text-[13px] font-semibold text-slate-900 liquido:text-[15px]">{pessoa.nome}</span>
              <span className="truncate text-xs text-slate-500 liquido:text-[13px]">{pessoa.setorNome ?? 'Sem setor'}</span>
            </div>
            <span className="ml-auto flex-none text-xs text-slate-600 tabular-nums liquido:text-[13px] liquido:text-slate-500">
              {String(pessoa.dia).padStart(2, '0')}/{String(mes).padStart(2, '0')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PainelAniversariantes
