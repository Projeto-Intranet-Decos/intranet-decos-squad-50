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

const VALOR_DESATIVADA = 'desativada'

export function isIntroducaoDesativada(usuarioId: string | null): boolean {
  try {
    return localStorage.getItem(chaveDe(usuarioId)) === VALOR_DESATIVADA
  } catch {
    return false
  }
}

/** Desativada: não abre sozinha. Reativada: apaga a chave e volta a abrir sozinha (GER-23). */
export function definirIntroducaoDesativada(usuarioId: string | null, desativada: boolean) {
  try {
    if (desativada) localStorage.setItem(chaveDe(usuarioId), VALOR_DESATIVADA)
    else localStorage.removeItem(chaveDe(usuarioId))
  } catch {
    // sem localStorage, a escolha não persiste
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
    // Quem desativou continua desativado ao encerrar uma abertura manual.
    if (!isIntroducaoDesativada(usuarioId)) marcarIntroducaoVista(usuarioId)
    setEncerradas((atuais) => [...atuais, usuarioId])
    setPedida(false)
  }

  return { aberta, abrir, encerrar }
}
