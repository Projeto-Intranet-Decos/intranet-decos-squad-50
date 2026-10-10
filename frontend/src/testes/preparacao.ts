import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { simularConsultasDeMidia } from './apoio'

beforeEach(() => {
  simularConsultasDeMidia(() => false)
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  const raiz = document.documentElement
  raiz.removeAttribute('style')
  raiz.removeAttribute('class')
  delete raiz.dataset.gradiente
})
