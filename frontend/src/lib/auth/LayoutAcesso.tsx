import type { ReactNode } from 'react'
import fachada from '../../shared/assets/fachada.png'
import logoDecos from '../../shared/assets/logo-decos.png'

interface PropriedadesLayoutAcesso {
  titulo: string
  children: ReactNode
}

/** Moldura das telas sem login: login e as páginas abertas pelo magic link (AUT-08). */
function LayoutAcesso({ titulo, children }: PropriedadesLayoutAcesso) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-2">
      <div className="flex min-h-screen flex-col items-center justify-between px-6 py-12 text-center lg:px-[8vw] lg:py-14">
        <div className="my-auto flex w-full max-w-[400px] flex-col items-center">
          <img
            src={logoDecos}
            alt="Hospital Decós"
            className="mb-11 h-11 w-[168px] object-contain"
          />

          <h1 className="mb-[34px] text-[30px] font-bold tracking-[-0.025em] text-slate-800">
            {titulo}
          </h1>

          {children}
        </div>

        <span className="pt-12 text-[11.5px] text-slate-400">
          Hospital Decós · Uso restrito a colaboradores
        </span>
      </div>

      <div className="relative hidden overflow-hidden bg-slate-800 lg:block">
        <img
          src={fachada}
          alt="Fachada do Hospital Decós"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(200deg, rgba(59,0,14,0.10) 0%, rgba(59,0,14,0.62) 100%)',
          }}
        />
      </div>
    </div>
  )
}

export default LayoutAcesso
