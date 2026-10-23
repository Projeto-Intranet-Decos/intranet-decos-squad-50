import type { Faq } from '../types'
import ItemFaq from './ItemFaq'

interface PropriedadesListaFaq {
  itens: Faq[]
  expandidoId: string | null
  aoAlternar: (id: string) => void
  podeGerenciar: (faq: Faq) => boolean
  aoEditar: (faq: Faq) => void
  aoExcluir: (faq: Faq) => void
}

function ListaFaq({ itens, expandidoId, aoAlternar, podeGerenciar, aoEditar, aoExcluir }: PropriedadesListaFaq) {
  if (itens.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-600">Nenhuma pergunta encontrada.</p>
  }

  return (
    <div className="flex flex-col">
      {itens.map((faq) => (
        <ItemFaq
          key={faq.id}
          faq={faq}
          expandido={expandidoId === faq.id}
          aoAlternar={() => aoAlternar(faq.id)}
          podeGerenciar={podeGerenciar(faq)}
          aoEditar={aoEditar}
          aoExcluir={aoExcluir}
        />
      ))}
    </div>
  )
}

export default ListaFaq
