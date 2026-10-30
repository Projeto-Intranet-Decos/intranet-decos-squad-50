import { usePreferencias } from '../../lib/preferencias/usePreferencias'
import { useConsultaDeMidia } from './useConsultaDeMidia'

const CONSULTA_MENOS_MOVIMENTO = '(prefers-reduced-motion: reduce)'

// GER-14 ("Reduzir animações") ou `prefers-reduced-motion` do SO: qualquer animação feita à mão
// (não coberta pelo `MotionConfig` global) deve checar isto e pular pro estado final direto.
export function useReduzirAnimacoes(): boolean {
  const preferencias = usePreferencias()
  const prefereMenosMovimento = useConsultaDeMidia(CONSULTA_MENOS_MOVIMENTO)
  return preferencias.reduzirAnimacoes || prefereMenosMovimento
}
