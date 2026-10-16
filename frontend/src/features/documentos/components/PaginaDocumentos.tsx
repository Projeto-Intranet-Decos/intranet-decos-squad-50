import { useMemo, useState } from 'react'
import { useAuth } from '../../../lib/auth/useAuth'
import { podeEditar, podeGerenciarConteudo } from '../../../lib/permissions'
import Botao from '../../../shared/components/Botao'
import Dropdown from '../../../shared/components/Dropdown'
import { IconeEnviar, IconeFunil, IconeLupa } from '../../../shared/components/icones'
import { useBaixarDocumento } from '../hooks/useBaixarDocumento'
import { useDocumentos } from '../hooks/useDocumentos'
import { useSetoresDocumentos } from '../hooks/useSetoresDocumentos'
import { ROTULOS_CATEGORIA, type CategoriaDocumento, type Documento } from '../types'
import LinhaDocumento, { COLUNAS_TABELA } from './LinhaDocumento'
import ModalDocumento from './ModalDocumento'
import ModalExcluirDocumento from './ModalExcluirDocumento'
import ModalPreviaDocumento from './ModalPreviaDocumento'

// Busca sem diferenciar maiúsculas nem acentos ("higienizacao" acha "Higienização").
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function PaginaDocumentos() {
  const { usuario } = useAuth()
  const [busca, setBusca] = useState('')
  const [setorId, setSetorId] = useState('')
  const [categoria, setCategoria] = useState<CategoriaDocumento | ''>('')

  // Setor e categoria filtram no backend; a busca por texto fica local pra
  // ignorar acentos e não disparar requisição a cada tecla.
  const { data: documentos = [], isLoading, isError } = useDocumentos({ setorId, categoria })
  const { data: setores = [] } = useSetoresDocumentos()
  const baixarDocumento = useBaixarDocumento()

  const [modalAberto, setModalAberto] = useState(false)
  const [documentoEditando, setDocumentoEditando] = useState<Documento | null>(null)
  const [documentoExcluindo, setDocumentoExcluindo] = useState<Documento | null>(null)
  const [documentoPrevia, setDocumentoPrevia] = useState<Documento | null>(null)

  const podeCriar = podeGerenciarConteudo(usuario)
  // admin_setor só publica no próprio setor; superadmin em qualquer um.
  const setoresPermitidos =
    usuario?.role === 'admin_setor' ? setores.filter((s) => s.id === usuario.setorId) : setores

  const opcoesCategoria = [
    { valor: '', rotulo: 'Todas as categorias' },
    ...Object.entries(ROTULOS_CATEGORIA).map(([valor, rotulo]) => ({ valor, rotulo })),
  ]
  const opcoesSetor = [{ valor: '', rotulo: 'Todos os setores' }, ...setores.map((s) => ({ valor: s.id, rotulo: s.nome }))]

  // Título ou palavra-chave: cada palavra digitada precisa aparecer no
  // título, na descrição, no nome do arquivo ou na categoria.
  const documentosFiltrados = useMemo(() => {
    const palavras = normalizar(busca).split(/\s+/).filter(Boolean)
    if (palavras.length === 0) return documentos
    return documentos.filter((documento) => {
      const texto = normalizar(
        `${documento.titulo} ${documento.descricao ?? ''} ${documento.nomeArquivo} ${documento.setorNome} ${ROTULOS_CATEGORIA[documento.categoria]}`,
      )
      return palavras.every((palavra) => texto.includes(palavra))
    })
  }, [documentos, busca])

  function podeGerenciarEste(documento: Documento) {
    return usuario ? podeEditar(usuario, { setorId: documento.setorId }) : false
  }

  function abrirNovo() {
    setDocumentoEditando(null)
    setModalAberto(true)
  }

  function abrirEdicao(documento: Documento) {
    setDocumentoEditando(documento)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setDocumentoEditando(null)
  }

  return (
    <div>
      <h1 className="m-0 mb-[22px] text-2xl font-semibold tracking-tight text-slate-900 ios:font-display ios:text-3xl ios:font-bold">POPs &amp; documentos</h1>

      <div className="mb-5 flex flex-wrap items-stretch gap-3 sm:gap-3.5">
        <label className="relative block w-full sm:w-auto sm:flex-[0_1_320px]">
          <IconeLupa
            tamanho={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-500 ios:left-4"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou palavra-chave"
            className="field h-full py-2.5 pl-[38px] text-[13.5px] ios:capsule-field ios:pl-10 ios:text-sm"
          />
        </label>

        <Dropdown
          rotuloPadrao="Categoria"
          icone={<IconeFunil tamanho={15} />}
          opcoes={opcoesCategoria}
          valor={categoria}
          aoMudar={(valor) => setCategoria(valor as CategoriaDocumento | '')}
        />

        <Dropdown
          rotuloPadrao="Setor"
          icone={<IconeFunil tamanho={15} />}
          opcoes={opcoesSetor}
          valor={setorId}
          aoMudar={setSetorId}
        />

        {podeCriar && (
          <Botao variante="primario" onClick={abrirNovo} className="w-full flex-none sm:ml-auto sm:w-auto">
            <IconeEnviar tamanho={15} />
            Enviar documento
          </Botao>
        )}
      </div>

      <div className="surface overflow-hidden">
        <div
          className={`hidden ${COLUNAS_TABELA} border-b border-slate-200/60 ios:border-slate-900/5 bg-white/40 px-[18px] py-3 ios:bg-white/35 text-xs font-medium tracking-wide text-slate-500 uppercase ios:font-semibold ios:tracking-normal ios:normal-case`}
        >
          <span>Documento</span>
          <span>Categoria</span>
          <span>Atualizado</span>
          <span>Ações</span>
        </div>

        {isLoading ? (
          <p className="m-0 px-[18px] py-4 text-sm text-slate-600">Carregando documentos…</p>
        ) : isError ? (
          <p className="m-0 px-[18px] py-4 text-sm text-critical">
            Não foi possível carregar os documentos. Tente novamente.
          </p>
        ) : documentosFiltrados.length === 0 ? (
          <p className="m-0 px-[18px] py-4 text-sm text-slate-600">
            {busca.trim() || setorId || categoria
              ? 'Nenhum documento encontrado com esses filtros.'
              : 'Nenhum documento publicado ainda.'}
          </p>
        ) : (
          <ul className="m-0 list-none p-0">
            {documentosFiltrados.map((documento) => (
              <LinhaDocumento
                key={documento.id}
                documento={documento}
                podeGerenciar={podeGerenciarEste(documento)}
                aoVisualizar={() => setDocumentoPrevia(documento)}
                aoBaixar={() => baixarDocumento.mutate({ documento })}
                aoEditar={() => abrirEdicao(documento)}
                aoExcluir={() => setDocumentoExcluindo(documento)}
              />
            ))}
          </ul>
        )}
      </div>

      {modalAberto && (
        <ModalDocumento
          key={documentoEditando?.id ?? 'novo'}
          aoFechar={fecharModal}
          documentoEditando={documentoEditando}
          setores={setoresPermitidos}
          escolheSetor={usuario?.role === 'superadmin'}
        />
      )}

      {documentoPrevia && (
        <ModalPreviaDocumento
          key={documentoPrevia.id}
          documento={documentoPrevia}
          aoFechar={() => setDocumentoPrevia(null)}
        />
      )}

      {documentoExcluindo && (
        <ModalExcluirDocumento
          key={documentoExcluindo.id}
          documento={documentoExcluindo}
          aoFechar={() => setDocumentoExcluindo(null)}
        />
      )}
    </div>
  )
}

export default PaginaDocumentos
