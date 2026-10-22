import { useCallback, useSyncExternalStore } from 'react'

// Lê uma media query e reage a mudanças (ex: redimensionar a janela, mudar a preferência do SO).
export function useConsultaDeMidia(consulta: string): boolean {
  const inscrever = useCallback(
    (aoMudar: () => void) => {
      const lista = window.matchMedia(consulta)
      lista.addEventListener('change', aoMudar)
      return () => lista.removeEventListener('change', aoMudar)
    },
    [consulta],
  )
  return useSyncExternalStore(inscrever, () => window.matchMedia(consulta).matches)
}
