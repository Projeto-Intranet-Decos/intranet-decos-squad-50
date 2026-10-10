import { vi } from 'vitest'

// O jsdom não tem matchMedia. A preparação deixa nenhuma consulta casando (tela estreita, sem
// preferência de movimento reduzido); o teste que precisar de outra coisa chama esta função.
export function simularConsultasDeMidia(casam: (consulta: string) => boolean) {
  window.matchMedia = vi.fn((consulta: string) => ({
    matches: casam(consulta),
    media: consulta,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}
