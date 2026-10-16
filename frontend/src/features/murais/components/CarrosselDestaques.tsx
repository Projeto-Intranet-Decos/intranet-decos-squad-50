import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { IconeCaretLeft, IconeCaretRight } from '../../../shared/components/icones'
import simboloDecos from '../../../shared/assets/simbolo.png'
import { formatarDiaMes, formatarHora } from '../formatadores'
import BadgeCategoria from './BadgeCategoria'
import type { Aviso } from '../types'

const INTERVALO_AUTOPLAY_MS = 6000

// Mapa de deslocamento da refração (GER-14): neutro (128) no meio e rampas nas bordas, o canal
// vermelho na horizontal e o verde na vertical. Somados, as bordas da placa puxam o fundo como
// uma lente.
const RAMPA_HORIZONTAL = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" preserveAspectRatio="none"><defs><linearGradient id="g"><stop offset="0" stop-color="#ff0000"/><stop offset="0.14" stop-color="#800000"/><stop offset="0.86" stop-color="#800000"/><stop offset="1" stop-color="#000000"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/></svg>`,
)}`
const RAMPA_VERTICAL = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" preserveAspectRatio="none"><defs><linearGradient id="g" x2="0" y2="1"><stop offset="0" stop-color="#00ff00"/><stop offset="0.22" stop-color="#008000"/><stop offset="0.78" stop-color="#008000"/><stop offset="1" stop-color="#000000"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/></svg>`,
)}`

/** Filtro usado pelo `backdrop-filter` da placa, só com a classe `refracao` no <html> (index.css). */
function FiltroRefracao() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute size-0">
      <filter
        id="refracao-vidro"
        x="0"
        y="0"
        width="100%"
        height="100%"
        colorInterpolationFilters="sRGB"
      >
        <feImage href={RAMPA_HORIZONTAL} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="horizontal" />
        <feImage href={RAMPA_VERTICAL} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="vertical" />
        <feComposite in="horizontal" in2="vertical" operator="arithmetic" k2="1" k3="1" result="mapa" />
        <feDisplacementMap in="SourceGraphic" in2="mapa" scale="64" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}

interface PropriedadesCarrossel {
  destaques: Aviso[]
  aoAbrir: (aviso: Aviso) => void
}

function CarrosselDestaques({ destaques, aoAbrir }: PropriedadesCarrossel) {
  const [indice, setIndice] = useState(0)

  const vazio = destaques.length === 0
  const total = destaques.length
  const anterior = () => setIndice((i) => (i - 1 + total) % total)
  const proximo = () => setIndice((i) => (i + 1) % total)
  const avisoAtual = destaques[indice]

  useEffect(() => {
    if (total < 2) return
    const id = setInterval(() => setIndice((i) => (i + 1) % total), INTERVALO_AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [total])

  return (
    <div className="relative mb-6 h-[280px] overflow-hidden rounded-card bg-slate-800 sm:h-[400px] liquido:rounded-panel">
      <FiltroRefracao />
      {vazio && (
        <div className="absolute inset-0">
          <div className="bg-bordeaux-gradient absolute inset-0" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={simboloDecos} alt="" className="h-40 w-auto opacity-[0.08] brightness-0 invert" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-slate-900/5 liquido:from-slate-900/60 liquido:via-slate-900/10 liquido:to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 p-5 pb-16 sm:p-8 liquido:p-4 liquido:pb-16 sm:liquido:p-6 sm:liquido:pb-6">
            <div className="refracao-vidro flex flex-col gap-2.5 liquido:glass-dark liquido:w-full liquido:rounded-[1.25rem] liquido:p-5 sm:liquido:w-auto sm:liquido:max-w-xl sm:liquido:self-start">
              <h2 className="m-0 max-w-xl text-xl leading-tight font-semibold tracking-tight text-balance text-white sm:text-[26px] liquido:font-display liquido:text-2xl liquido:font-bold sm:liquido:text-3xl">
                Nenhum aviso
              </h2>
            </div>
          </div>
        </div>
      )}

      {!vazio && (
        <AnimatePresence>
          <motion.button
            key={avisoAtual.id}
            type="button"
            onClick={() => aoAbrir(avisoAtual)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 block text-left"
          >
            <div
              className={`absolute inset-0 bg-cover bg-center ${avisoAtual.urlImagem ? 'bg-slate-700' : 'bg-bordeaux-gradient'}`}
              style={avisoAtual.urlImagem ? { backgroundImage: `url(${avisoAtual.urlImagem})` } : undefined}
            />
            {!avisoAtual.urlImagem && (
              <div className="absolute inset-0 flex items-center justify-center">
                <img src={simboloDecos} alt="" className="h-40 w-auto opacity-[0.08] brightness-0 invert" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-slate-900/5 liquido:from-slate-900/60 liquido:via-slate-900/10 liquido:to-transparent" />
            {/* No Vidro líquido o texto fica numa placa de vidro escuro, no mesmo lugar. Abaixo de sm
                ela ocupa a largura toda; acima, só o necessário, sem passar dos controles. */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 p-5 pb-16 sm:p-8 liquido:p-4 liquido:pb-16 sm:liquido:p-6 sm:liquido:pr-[13.5rem]">
              <div className="refracao-vidro flex flex-col gap-2.5 liquido:glass-dark liquido:w-full liquido:rounded-[1.25rem] liquido:p-5 sm:liquido:w-auto sm:liquido:max-w-xl sm:liquido:self-start">
                <div className="flex items-center gap-3 text-[10.5px] tracking-wide text-white/80 liquido:text-xs liquido:tracking-normal liquido:text-white/75 liquido:tabular-nums">
                  <BadgeCategoria categoria={avisoAtual.categoria} sobreFoto />
                  <span>
                    {formatarDiaMes(avisoAtual.criadoEm)} · {formatarHora(avisoAtual.criadoEm)}
                  </span>
                </div>
                <h2 className="m-0 max-w-xl text-xl leading-tight font-semibold tracking-tight text-balance text-white sm:text-[26px] liquido:font-display liquido:text-2xl liquido:font-bold sm:liquido:text-3xl">
                  {avisoAtual.titulo}
                </h2>
                <span className="text-[13px] text-white/80 liquido:text-sm liquido:text-white/75">{avisoAtual.autorNome}</span>
              </div>
            </div>
          </motion.button>
        </AnimatePresence>
      )}

      {!vazio && (
        <div className="absolute right-4 bottom-4 flex items-center gap-3.5 sm:right-5 sm:bottom-5 liquido:gap-2.5 sm:liquido:right-6 sm:liquido:bottom-6">
          <div className="flex gap-1.5 liquido:glass-dark liquido:items-center liquido:rounded-full liquido:px-2.5 liquido:py-1.5">
            {destaques.map((aviso, i) => (
              <button
                key={aviso.id}
                type="button"
                title={aviso.titulo}
                onClick={() => setIndice(i)}
                aria-current={i === indice ? 'true' : undefined}
                className={`h-1.5 rounded-full transition-all ${
                  i === indice ? 'w-[22px] bg-white liquido:w-5' : 'w-1.5 bg-white/[0.42] liquido:bg-white/50'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={anterior}
              title="Anterior"
              aria-label="Anterior"
              className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 sm:size-8 liquido:btn-icon is-dark"
            >
              <IconeCaretLeft tamanho={16} />
            </button>
            <button
              type="button"
              onClick={proximo}
              title="Próximo"
              aria-label="Próximo"
              className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 sm:size-8 liquido:btn-icon is-dark"
            >
              <IconeCaretRight tamanho={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CarrosselDestaques
