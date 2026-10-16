import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { IconeCaretLeft, IconeCaretRight } from '../../../shared/components/icones'
import simboloDecos from '../../../shared/assets/simbolo.png'
import { formatarDiaMes, formatarHora } from '../formatadores'
import BadgeCategoria from './BadgeCategoria'
import type { Aviso } from '../types'

const INTERVALO_AUTOPLAY_MS = 6000

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
    <div className="relative mb-6 h-[280px] overflow-hidden rounded-card bg-slate-800 sm:h-[400px] ios:rounded-panel">
      {vazio && (
        <div className="absolute inset-0">
          <div className="bg-bordeaux-gradient absolute inset-0" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={simboloDecos} alt="" className="h-40 w-auto opacity-[0.08] brightness-0 invert" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-slate-900/5 ios:from-slate-900/60 ios:via-slate-900/10 ios:to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 p-5 pb-16 sm:p-8 ios:p-4 ios:pb-16 sm:ios:p-6 sm:ios:pb-6">
            <div className="flex flex-col gap-2.5 ios:glass-dark ios:w-full ios:rounded-[1.25rem] ios:p-5 sm:ios:w-auto sm:ios:max-w-xl sm:ios:self-start">
              <h2 className="m-0 max-w-xl text-xl leading-tight font-semibold tracking-tight text-balance text-white sm:text-[26px] ios:font-display ios:text-2xl ios:font-bold sm:ios:text-3xl">
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
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-slate-900/5 ios:from-slate-900/60 ios:via-slate-900/10 ios:to-transparent" />
            {/* No iOS Glass o texto fica numa placa de vidro escuro, no mesmo lugar. Abaixo de sm
                ela ocupa a largura toda; acima, só o necessário, sem passar dos controles. */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 p-5 pb-16 sm:p-8 ios:p-4 ios:pb-16 sm:ios:p-6 sm:ios:pr-[13.5rem]">
              <div className="flex flex-col gap-2.5 ios:glass-dark ios:w-full ios:rounded-[1.25rem] ios:p-5 sm:ios:w-auto sm:ios:max-w-xl sm:ios:self-start">
                <div className="flex items-center gap-3 text-[10.5px] tracking-wide text-white/80 ios:text-xs ios:tracking-normal ios:text-white/75 ios:tabular-nums">
                  <BadgeCategoria categoria={avisoAtual.categoria} sobreFoto />
                  <span>
                    {formatarDiaMes(avisoAtual.criadoEm)} · {formatarHora(avisoAtual.criadoEm)}
                  </span>
                </div>
                <h2 className="m-0 max-w-xl text-xl leading-tight font-semibold tracking-tight text-balance text-white sm:text-[26px] ios:font-display ios:text-2xl ios:font-bold sm:ios:text-3xl">
                  {avisoAtual.titulo}
                </h2>
                <span className="text-[13px] text-white/80 ios:text-sm ios:text-white/75">{avisoAtual.autorNome}</span>
              </div>
            </div>
          </motion.button>
        </AnimatePresence>
      )}

      {!vazio && (
        <div className="absolute right-4 bottom-4 flex items-center gap-3.5 sm:right-5 sm:bottom-5 ios:gap-2.5 sm:ios:right-6 sm:ios:bottom-6">
          <div className="flex gap-1.5 ios:glass-dark ios:items-center ios:rounded-full ios:px-2.5 ios:py-1.5">
            {destaques.map((aviso, i) => (
              <button
                key={aviso.id}
                type="button"
                title={aviso.titulo}
                onClick={() => setIndice(i)}
                aria-current={i === indice ? 'true' : undefined}
                className={`h-1.5 rounded-full transition-all ${
                  i === indice ? 'w-[22px] bg-white ios:w-5' : 'w-1.5 bg-white/[0.42] ios:bg-white/50'
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
              className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 sm:size-8 ios:btn-icon is-dark"
            >
              <IconeCaretLeft tamanho={16} />
            </button>
            <button
              type="button"
              onClick={proximo}
              title="Próximo"
              aria-label="Próximo"
              className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 sm:size-8 ios:btn-icon is-dark"
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
