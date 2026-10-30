import type { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import { usePreferencias } from './usePreferencias'

/** Leva a preferência "Reduzir animações" às animações da biblioteca motion. */
function ConfiguracaoDeMovimento({ children }: { children: ReactNode }) {
  const { reduzirAnimacoes } = usePreferencias()
  return <MotionConfig reducedMotion={reduzirAnimacoes ? 'always' : 'user'}>{children}</MotionConfig>
}

export default ConfiguracaoDeMovimento
