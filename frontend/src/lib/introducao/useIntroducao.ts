import { useState } from 'react'

const PREFIXO_CHAVE = 'intranet:introducao:'

function chaveDe(usuarioId: string | null) {
  return PREFIXO_CHAVE + (usuarioId ?? 'visitante')
}

export function isIntroducaoVista(usuarioId: string | null): boolean {
  try {
    return localStorage.getItem(chaveDe(usuarioId)) !== null
  } catch {
    return false
  }
}

export function marcarIntroducaoVista(usuarioId: string | null) {
  try {
    localStorage.setItem(chaveDe(usuarioId), 'vista')
  } catch {
    // sem localStorage, vale só até recarregar a página
  }
}

export function useIntroducao(usuarioId: string | null) {
  const [pedida, setPedida] = useState(false)
  const [encerradas, setEncerradas] = useState<(string | null)[]>([])
  const aberta = pedida || (!encerradas.includes(usuarioId) && !isIntroducaoVista(usuarioId))

  function abrir() {
    setPedida(true)
  }

  function encerrar() {
    marcarIntroducaoVista(usuarioId)
    setEncerradas((atuais) => [...atuais, usuarioId])
    setPedida(false)
  }

  return { aberta, abrir, encerrar }
}
