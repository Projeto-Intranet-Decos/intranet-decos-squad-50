import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Papel } from './tipos'
import { useAuth } from './useAuth'

interface PropriedadesRotaProtegida {
  children: ReactNode
  papeisPermitidos?: Papel[]
}

function RotaProtegida({ children, papeisPermitidos }: PropriedadesRotaProtegida) {
  const { usuario } = useAuth()
  const local = useLocation()

  if (!usuario) {
    return <Navigate to="/login" replace state={{ de: local.pathname }} />
  }
  if (papeisPermitidos && !papeisPermitidos.includes(usuario.role)) {
    return <Navigate to="/nao-autorizado" replace />
  }
  return <>{children}</>
}

export default RotaProtegida
