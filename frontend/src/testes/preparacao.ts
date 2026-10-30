import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { limparTokens } from '../lib/auth/useAuth'
import { simularConsultasDeMidia, simularNavegador } from './apoio'

beforeEach(() => {
  simularConsultasDeMidia(() => false)
})

afterEach(() => {
  cleanup()
  simularNavegador(null)
  // O access token vive na memória do módulo (AUT-07): sem isto, passaria de um teste para o outro.
  limparTokens()
  localStorage.clear()
  const raiz = document.documentElement
  raiz.removeAttribute('style')
  raiz.removeAttribute('class')
  delete raiz.dataset.gradiente
  delete raiz.dataset.visual
})
