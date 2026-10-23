import { useState } from 'react'
import { useAuth } from '../../../lib/auth/useAuth'
import { canGerenciarAtalhos } from '../../../lib/permissions'
import { IconeMais } from '../../../shared/components/icones'
import SecaoMenu from '../../../shared/components/SecaoMenu'
import { useAtalhos } from '../hooks/useAtalhos'
import FormularioAtalho from './FormularioAtalho'
import ItemAtalho from './ItemAtalho'

interface PropriedadesListaAtalhos {
  compacto: boolean
  semAnimacao: boolean
  aoNavegar: () => void
}

// Seção "Acesso rápido" da barra lateral (ATA-05, colapsável conforme GER-19).
function ListaAtalhos({ compacto, semAnimacao, aoNavegar }: PropriedadesListaAtalhos) {
  const { usuario } = useAuth()
  const { data: atalhos = [], isError } = useAtalhos()
  const [criando, setCriando] = useState(false)
  const gerenciavel = canGerenciarAtalhos(usuario)

  if (!gerenciavel && atalhos.length === 0) return null

  return (
    <SecaoMenu
      titulo="Acesso rápido"
      compacto={compacto}
      semAnimacao={semAnimacao}
      className="mt-5 border-t border-white/70 pt-4 liquido:border-slate-900/5"
      acoes={
        !compacto &&
        gerenciavel &&
        !criando && (
          <button
            type="button"
            onClick={() => setCriando(true)}
            title="Adicionar atalho"
            aria-label="Adicionar atalho"
            className="flex size-8 flex-none items-center justify-center rounded-lg text-slate-500 transition-[color,background-color,scale] hover:bg-white/60 hover:text-brand-600 lg:size-6 lg:rounded-md liquido:rounded-full liquido:hover:bg-white/50 liquido:active:scale-[0.94]"
          >
            <IconeMais tamanho={15} />
          </button>
        )
      }
    >
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
    </SecaoMenu>
  )
}

export default ListaAtalhos
