import { useState } from 'react'
import { useAuth } from '../../../lib/auth/useAuth'
import { podeGerenciarAtalhos } from '../../../lib/permissions'
import { IconeMais } from '../../../shared/components/icones'
import { useAtalhos } from '../hooks/useAtalhos'
import FormularioAtalho from './FormularioAtalho'
import ItemAtalho from './ItemAtalho'

interface PropriedadesListaAtalhos {
  compacto: boolean
  aoNavegar: () => void
}

// Seção "Acesso rápido" da barra lateral (ATA-05).
function ListaAtalhos({ compacto, aoNavegar }: PropriedadesListaAtalhos) {
  const { usuario } = useAuth()
  const { data: atalhos = [], isError } = useAtalhos()
  const [criando, setCriando] = useState(false)
  const gerenciavel = podeGerenciarAtalhos(usuario)

  if (!gerenciavel && atalhos.length === 0) return null

  return (
    <div className="mt-5 flex flex-col gap-1 border-t border-white/70 pt-4 liquido:border-slate-900/5">
      {!compacto && (
        <div className="flex items-center justify-between pr-1.5 pb-2 pl-3 liquido:pl-3.5">
          {/* A caixa alta é do Vidro clínico; no Vidro líquido o rótulo fica em frase normal. */}
          <span className="text-[10px] tracking-[0.12em] text-slate-500 uppercase liquido:text-xs liquido:font-semibold liquido:tracking-normal liquido:normal-case">
            Acesso rápido
          </span>
          {gerenciavel && !criando && (
            <button
              type="button"
              onClick={() => setCriando(true)}
              title="Adicionar atalho"
              aria-label="Adicionar atalho"
              className="flex size-8 flex-none items-center justify-center rounded-lg text-slate-500 transition-[color,background-color,scale] hover:bg-white/60 hover:text-brand-600 lg:size-6 lg:rounded-md liquido:rounded-full liquido:hover:bg-white/50 liquido:active:scale-[0.94]"
            >
              <IconeMais tamanho={15} />
            </button>
          )}
        </div>
      )}
      {atalhos.map((atalho) => (
        <ItemAtalho
          key={atalho.id}
          atalho={atalho}
          compacto={compacto}
          gerenciavel={gerenciavel}
          aoNavegar={aoNavegar}
        />
      ))}
      {criando && !compacto && <FormularioAtalho id={null} aoConcluir={() => setCriando(false)} />}
      {gerenciavel && !compacto && !criando && atalhos.length === 0 && (
        <span className="px-3 text-xs text-slate-500 liquido:px-3.5 liquido:text-[13px]">
          {isError ? 'Não foi possível carregar os atalhos.' : 'Nenhum atalho cadastrado.'}
        </span>
      )}
    </div>
  )
}

export default ListaAtalhos
