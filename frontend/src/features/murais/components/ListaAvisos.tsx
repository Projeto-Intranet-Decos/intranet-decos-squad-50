import { motion } from 'motion/react'
import { formatarDiaMes } from '../formatadores'
import CartaoAviso from './CartaoAviso'
import type { Aviso } from '../types'

const ATRASO_POR_ITEM_S = 0.05
const ATRASO_MAXIMO_S = 0.5

interface PropriedadesListaAvisos {
  avisos: Aviso[]
  podeGerenciarAviso: (aviso: Aviso) => boolean
  aoAbrir: (aviso: Aviso) => void
  aoEditar: (aviso: Aviso) => void
  aoExcluir: (aviso: Aviso) => void
}

interface ItemComIndicadorDia {
  aviso: Aviso
  diaTexto: string
  corPonto: string
}

// Função pura fora do componente: monta a lista já com o indicador de
// "primeiro aviso do dia" (rótulo de data + cor do ponto na timeline),
// sem mutar nenhuma variável durante a renderização em si.
function agruparPorDia(avisos: Aviso[]): ItemComIndicadorDia[] {
  const itens: ItemComIndicadorDia[] = []
  let diaAnterior: string | null = null
  for (const aviso of avisos) {
    const dia = formatarDiaMes(aviso.criadoEm)
    const primeiroDoDia = dia !== diaAnterior
    diaAnterior = dia
    itens.push({ aviso, diaTexto: primeiroDoDia ? dia : '', corPonto: primeiroDoDia ? 'var(--color-brand-600)' : 'var(--color-slate-300)' })
  }
  return itens
}

function ListaAvisos({ avisos, podeGerenciarAviso, aoAbrir, aoEditar, aoExcluir }: PropriedadesListaAvisos) {
  if (avisos.length === 0) {
    return <p className="py-16 text-center text-sm text-slate-600">Nenhum aviso encontrado.</p>
  }

  const itens = agruparPorDia(avisos)

  return (
    <div className="flex min-w-0 flex-col gap-[26px]">
      {itens.map(({ aviso, diaTexto, corPonto }, indice) => (
        <motion.div
          key={aviso.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: Math.min(indice * ATRASO_POR_ITEM_S, ATRASO_MAXIMO_S) }}
        >
          <CartaoAviso
            aviso={aviso}
            diaTexto={diaTexto}
            corPonto={corPonto}
            podeGerenciar={podeGerenciarAviso(aviso)}
            aoAbrir={() => aoAbrir(aviso)}
            aoEditar={(e) => {
              e.stopPropagation()
              aoEditar(aviso)
            }}
            aoExcluir={(e) => {
              e.stopPropagation()
              aoExcluir(aviso)
            }}
          />
        </motion.div>
      ))}
    </div>
  )
}

export default ListaAvisos
