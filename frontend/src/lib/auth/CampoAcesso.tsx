import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { IconeOlho, IconeOlhoFechado } from '../../shared/components/icones'

interface PropriedadesCampoAcesso extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string
  erro?: string
}

/** Campo das telas de acesso (LayoutAcesso). `type="password"` ganha o botão de mostrar a senha. */
const CampoAcesso = forwardRef<HTMLInputElement, PropriedadesCampoAcesso>(function CampoAcesso(
  { rotulo, erro, type, className, ...resto },
  ref,
) {
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const ehSenha = type === 'password'

  return (
    <label className="flex flex-col gap-[7px]">
      <span className="text-[11px] font-medium tracking-[0.07em] text-slate-500 uppercase">
        {rotulo}
      </span>
      <div className="relative block">
        <input
          ref={ref}
          type={ehSenha && mostrarSenha ? 'text' : type}
          className={`w-full rounded-lg border border-slate-200 bg-slate-50 py-[13px] pl-[14px] text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#800020] ${ehSenha ? 'pr-[46px]' : 'pr-[14px]'} ${className ?? ''}`}
          {...resto}
        />
        {ehSenha && (
          <button
            type="button"
            onClick={() => setMostrarSenha((prev) => !prev)}
            title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute right-[6px] top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            {mostrarSenha ? <IconeOlhoFechado /> : <IconeOlho />}
          </button>
        )}
      </div>
      {erro && <span className="text-xs text-critical">{erro}</span>}
    </label>
  )
})

export default CampoAcesso
