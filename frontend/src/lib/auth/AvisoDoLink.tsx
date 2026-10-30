import type { ReactNode } from 'react'

interface PropriedadesAvisoDoLink {
  mensagem: string
  /** Ação de saída: link ou botão, com a classe de botão das telas de acesso. */
  children: ReactNode
}

/** Aviso das páginas de magic link quando não dá para seguir (link inválido, falha de rede). */
function AvisoDoLink({ mensagem, children }: PropriedadesAvisoDoLink) {
  return (
    <div className="flex w-full flex-col gap-5 text-sm text-slate-600">
      <p role="alert">{mensagem}</p>
      {children}
    </div>
  )
}

export default AvisoDoLink
