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
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 bg-white/40 px-[18px] py-3 ios:border-slate-900/5 ios:bg-transparent ios:px-5 ios:pt-4 ios:pb-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-600 ios:gap-2 ios:text-sm ios:tracking-[0.02em] ios:text-slate-900 ios:[&_svg]:size-[18px]">
          <IconeUsuarios tamanho={16} className="text-brand-600" />
          ANIVERSARIANTES DE {NOMES_MESES[mes - 1].toUpperCase()}
        </span>
        <span className="flex-none text-[11px] text-slate-500 tabular-nums ios:text-sm">{ordenados.length} PESSOAS</span>
      </div>
      <div className="flex flex-col px-[18px] pb-[18px] ios:px-5 ios:pb-3">
        {ordenados.length === 0 && (
          <p className="m-0 py-6 text-center text-[13px] text-slate-600 ios:text-sm ios:text-slate-500">
            Nenhum aniversariante neste mês.
          </p>
        )}
        {ordenados.map((pessoa) => (
          <div
            key={pessoa.id}
            className="relative flex items-center gap-[11px] border-t border-slate-200/60 py-2.5 first:border-t-0 ios:gap-3 ios:border-t-0 ios:[&+&]:before:absolute ios:[&+&]:before:top-0 ios:[&+&]:before:right-0 ios:[&+&]:before:left-12 ios:[&+&]:before:border-t ios:[&+&]:before:border-slate-900/5"
          >
            <span className="flex size-[34px] flex-none items-center justify-center rounded-full bg-brand-100 text-brand-700 ios:size-9">
              <IconeUsuario tamanho={19} />
            </span>
            <div className="flex min-w-0 flex-col leading-snug">
              <span className="truncate text-[13px] font-semibold text-slate-900 ios:text-[15px]">{pessoa.nome}</span>
              <span className="truncate text-xs text-slate-500 ios:text-[13px]">{pessoa.setorNome ?? 'Sem setor'}</span>
            </div>
            <span className="ml-auto flex-none text-xs text-slate-600 tabular-nums ios:text-[13px] ios:text-slate-500">
              {String(pessoa.dia).padStart(2, '0')}/{String(mes).padStart(2, '0')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PainelAniversariantes
