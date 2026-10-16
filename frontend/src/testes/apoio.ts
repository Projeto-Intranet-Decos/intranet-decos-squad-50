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

// O jsdom não tem `navigator.userAgentData` (só os navegadores Chromium têm). `null` remove.
export function simularNavegador(marcas: string[] | null) {
  if (marcas === null) {
    delete (navigator as { userAgentData?: unknown }).userAgentData
    return
  }
  Object.defineProperty(navigator, 'userAgentData', {
    value: { brands: marcas.map((brand) => ({ brand, version: '1' })) },
    configurable: true,
  })
}
