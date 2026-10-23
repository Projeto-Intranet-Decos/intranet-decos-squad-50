import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/** A API recusou o magic link: inexistente, expirado, já usado ou de outra finalidade (AUT-08). */
export function ehLinkRecusado(erro: unknown) {
  return isAxiosError(erro) && erro.response?.status === 400
}

function lerToken(hash: string) {
  return new URLSearchParams(hash.replace(/^#/, '')).get('token') ?? ''
}

/** Token do magic link (AUT-08): lido do fragmento (#token=) e logo tirado da barra de endereço. */
export function useTokenDoLink() {
  const local = useLocation()
  const navegar = useNavigate()
  // Lido uma vez só: o efeito abaixo apaga o fragmento em seguida.
  const [token] = useState(() => lerToken(local.hash))

  useEffect(() => {
    if (local.hash) navegar({ pathname: local.pathname, search: local.search }, { replace: true })
  }, [local.hash, local.pathname, local.search, navegar])

  return token
}
