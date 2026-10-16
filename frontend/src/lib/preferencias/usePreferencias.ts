import { useSyncExternalStore } from 'react'
import { inscreverPreferencias, obterPreferencias } from './preferencias'

export function usePreferencias() {
  return useSyncExternalStore(inscreverPreferencias, obterPreferencias)
}
