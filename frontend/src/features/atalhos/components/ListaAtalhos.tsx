import { useState } from 'react'
import { useAuth } from '../../../lib/auth/useAuth'
import { podeGerenciarAtalhos } from '../../../lib/permissions'
import { IconeMais } from '../../../shared/components/icones'
import { useAtalhos } from '../hooks/useAtalhos'
import FormularioAtalho from './FormularioAtalho'
import ItemAtalho from './ItemAtalho'

interface PropriedadesListaAtalhos {
  recolhido: boolean
}

// Seção "Acesso rápido" da barra lateral (ATA-05).
function ListaAtalhos({ recolhido }: PropriedadesListaAtalhos) {
  const { usuario } = useAuth()
  const { data: atalhos = [], isError } = useAtalhos()
  const [criando, setCriando] = useState(false)
  const gerenciavel = podeGerenciarAtalhos(usuario)

  if (!gerenciavel && atalhos.length === 0) return null

  return (
    <div className="mt-5 flex flex-col gap-1 border-t border-slate-100 pt-4">
      {!recolhido && (
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-[10px] tracking-[0.12em] text-slate-400">ACESSO RÁPIDO</span>
          {gerenciavel && !criando && (
            <button
              type="button"
              onClick={() => setCriando(true)}
              title="Adicionar atalho"
              aria-label="Adicionar atalho"
              className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-[#800020]"
            >
              <IconeMais tamanho={14} />
            </button>
          )}
        </div>
      )}
      {atalhos.map((atalho) => (
        <ItemAtalho key={atalho.id} atalho={atalho} recolhido={recolhido} gerenciavel={gerenciavel} />
      ))}
      {criando && !recolhido && <FormularioAtalho id={null} aoConcluir={() => setCriando(false)} />}
      {gerenciavel && !recolhido && !criando && atalhos.length === 0 && (
        <span className="px-3 text-[12px] text-slate-400">
          {isError ? 'Não foi possível carregar os atalhos.' : 'Nenhum atalho cadastrado.'}
        </span>
      )}
    </div>
  )
}

export default ListaAtalhos
