// Preferências de interface (GER-14): ajustes visuais do navegador, sem backend.

export type GradienteFundo = 'desligado' | 'suave' | 'intenso'

/** `ios`: iOS Glass (docs/DESIGN_IOS_GLASS.md). `clinico`: Vidro clínico (docs/DESIGN_PROMPT.md). */
export type EstiloVisual = 'ios' | 'clinico'

export interface PreferenciasInterface {
  /** Desfoque do vidro estrutural, em px. */
  desfoque: number
  /** Transparência do vidro, em %. */
  transparencia: number
  gradiente: GradienteFundo
  visual: EstiloVisual
  /** Refração na placa do carrossel; só tem efeito no iOS Glass e no Chromium. */
  refracao: boolean
  rolagemElastica: boolean
  reduzirAnimacoes: boolean
}

export const CHAVE_PREFERENCIAS = 'intranet:preferencias'

export const PREFERENCIAS_PADRAO: PreferenciasInterface = {
  desfoque: 16,
  transparencia: 60,
  gradiente: 'suave',
  visual: 'ios',
  refracao: true,
  rolagemElastica: true,
  reduzirAnimacoes: false,
}

export const LIMITES = {
  desfoque: { minimo: 0, maximo: 24 },
  transparencia: { minimo: 0, maximo: 100 },
}

const GRADIENTES: GradienteFundo[] = ['desligado', 'suave', 'intenso']
const VISUAIS: EstiloVisual[] = ['ios', 'clinico']

let atuais = PREFERENCIAS_PADRAO
const inscritos = new Set<() => void>()

function numeroValido(valor: unknown, limite: { minimo: number; maximo: number }, padrao: number) {
  return typeof valor === 'number' && valor >= limite.minimo && valor <= limite.maximo ? valor : padrao
}

function opcaoValida<T extends string>(valor: unknown, opcoes: T[], padrao: T): T {
  return opcoes.includes(valor as T) ? (valor as T) : padrao
}

function booleanoValido(valor: unknown, padrao: boolean) {
  return typeof valor === 'boolean' ? valor : padrao
}

// Campo a campo: um valor inválido volta ao padrão sem derrubar os outros.
function normalizar(bruto: unknown): PreferenciasInterface {
  const dados = (typeof bruto === 'object' && bruto !== null ? bruto : {}) as Record<string, unknown>
  return {
    desfoque: numeroValido(dados.desfoque, LIMITES.desfoque, PREFERENCIAS_PADRAO.desfoque),
    transparencia: numeroValido(dados.transparencia, LIMITES.transparencia, PREFERENCIAS_PADRAO.transparencia),
    gradiente: opcaoValida(dados.gradiente, GRADIENTES, PREFERENCIAS_PADRAO.gradiente),
    visual: opcaoValida(dados.visual, VISUAIS, PREFERENCIAS_PADRAO.visual),
    refracao: booleanoValido(dados.refracao, PREFERENCIAS_PADRAO.refracao),
    rolagemElastica: booleanoValido(dados.rolagemElastica, PREFERENCIAS_PADRAO.rolagemElastica),
    reduzirAnimacoes: booleanoValido(dados.reduzirAnimacoes, PREFERENCIAS_PADRAO.reduzirAnimacoes),
  }
}

/**
 * A refração usa um filtro SVG no `backdrop-filter`, que só os navegadores Chromium desenham. Só
 * eles têm `navigator.userAgentData`; nos outros a placa fica só com o desfoque.
 */
export function suportaRefracao(): boolean {
  const dados = (navigator as { userAgentData?: { brands?: { brand: string }[] } }).userAgentData
  return dados?.brands?.some((marca) => marca.brand === 'Chromium') ?? false
}

// O localStorage pode estar bloqueado (navegação privada); aí as preferências valem só na sessão.
function ler(): PreferenciasInterface {
  try {
    return normalizar(JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS) ?? 'null'))
  } catch {
    return PREFERENCIAS_PADRAO
  }
}

function gravar(preferencias: PreferenciasInterface) {
  try {
    localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(preferencias))
  } catch {
    // segue sem persistir
  }
}

// O CSS (index.css) lê estas variáveis e classes no <html>.
function aplicar(preferencias: PreferenciasInterface) {
  const raiz = document.documentElement
  const { desfoque, transparencia, gradiente, visual, refracao, rolagemElastica, reduzirAnimacoes } = preferencias

  raiz.style.setProperty('--vidro-desfoque', `${desfoque}px`)
  // 1 = transparência do design original (o padrão); 0 = sólido.
  raiz.style.setProperty(
    '--vidro-transparencia',
    String(Number((transparencia / PREFERENCIAS_PADRAO.transparencia).toFixed(3))),
  )
  raiz.dataset.gradiente = gradiente
  // A variante `ios:` do Tailwind e os blocos `@variant ios` do index.css leem este atributo.
  raiz.dataset.visual = visual
  raiz.classList.toggle('sem-desfoque', desfoque === 0)
  raiz.classList.toggle('refracao', refracao && suportaRefracao())
  raiz.classList.toggle('reduzir-animacoes', reduzirAnimacoes)
  raiz.classList.toggle('rolagem-elastica', rolagemElastica && !reduzirAnimacoes)
}

function trocar(novas: PreferenciasInterface) {
  atuais = novas
  aplicar(atuais)
  gravar(atuais)
  inscritos.forEach((aoMudar) => aoMudar())
}

/** Chamada antes do primeiro render, para a página já nascer com as preferências. */
export function iniciarPreferencias() {
  atuais = ler()
  aplicar(atuais)
}

export function obterPreferencias(): PreferenciasInterface {
  return atuais
}

export function definirPreferencias(mudancas: Partial<PreferenciasInterface>) {
  trocar(normalizar({ ...atuais, ...mudancas }))
}

export function restaurarPreferencias() {
  trocar(PREFERENCIAS_PADRAO)
}

export function inscreverPreferencias(aoMudar: () => void) {
  inscritos.add(aoMudar)
  return () => {
    inscritos.delete(aoMudar)
  }
}
