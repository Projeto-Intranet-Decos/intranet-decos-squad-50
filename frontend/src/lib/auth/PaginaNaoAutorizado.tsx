import { Link } from 'react-router-dom'
import { IconeAlerta } from '../../shared/components/icones'

function PaginaNaoAutorizado() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="surface flex max-w-md flex-col items-center gap-4 px-6 py-10 text-center sm:px-10">
        <span className="flex size-14 items-center justify-center rounded-full bg-danger-50 text-danger-600">
          <IconeAlerta tamanho={28} />
        </span>
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-slate-900 liquido:font-display liquido:text-3xl liquido:font-bold">
          Acesso não autorizado
        </h1>
        <p className="m-0 text-sm leading-relaxed text-slate-600">
          Seu perfil não tem permissão para abrir esta página. Se você precisa desse acesso, fale com um
          superadministrador.
        </p>
        <Link to="/mural" className="btn btn-primary mt-2">
          Ir para o mural
        </Link>
      </div>
    </div>
  )
}

export default PaginaNaoAutorizado
