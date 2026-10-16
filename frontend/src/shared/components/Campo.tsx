import type { ReactNode } from 'react'

interface PropriedadesCampo {
  rotulo: string
  erro?: string
  children: ReactNode
  className?: string
}

function Campo({ rotulo, erro, children, className }: PropriedadesCampo) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      {/* A caixa alta é do Vidro clínico; no iOS Glass o rótulo fica em frase normal. */}
      <span className="text-xs font-medium tracking-wide text-slate-700 uppercase ios:text-sm ios:tracking-normal ios:normal-case">
        {rotulo}
      </span>
      {children}
      {erro && <span className="text-xs text-critical">{erro}</span>}
    </label>
  )
}

export default Campo
