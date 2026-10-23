import { useMemo, useState } from 'react'
import { useAuth } from '../../../lib/auth/useAuth'
import { canEditar, canEscolherSetor, canGerenciarConteudo, setoresParaPublicar } from '../../../lib/permissions'
import Botao from '../../../shared/components/Botao'
import CabecalhoOrdenavel from '../../../shared/components/CabecalhoOrdenavel'
import Dropdown from '../../../shared/components/Dropdown'
import { IconeEnviar, IconeFunil, IconeLupa } from '../../../shared/components/icones'
import Skeleton from '../../../shared/components/Skeleton'
import { useOrdenacaoClique } from '../../../shared/hooks/useOrdenacaoClique'
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

const LINHAS_SKELETON = 5

function LinhaSkeleton({ indice }: { indice: number }) {
  return (
    <li className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 ${COLUNAS_TABELA} tabela-linha px-[18px] py-3.5`}>
      <div className="col-span-2 flex min-w-0 items-center gap-3.5 md:col-span-1">
        <Skeleton className="h-9 w-9 flex-none rounded-lg liquido:rounded-[0.625rem]" />
        <Skeleton className={`h-4 ${indice % 2 === 0 ? 'w-44' : 'w-32'}`} />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-3.5 w-16 justify-self-end md:justify-self-start" />
      <div className="col-span-2 flex items-center justify-end gap-2 md:col-span-1">
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </li>
  )
}

type ColunaDocumento = 'titulo' | 'categoria' | 'atualizado'

function compararDocumentos(a: Documento, b: Documento, coluna: ColunaDocumento): number {
  switch (coluna) {
    case 'categoria':
      return ROTULOS_CATEGORIA[a.categoria].localeCompare(ROTULOS_CATEGORIA[b.categoria], 'pt-BR')
    case 'atualizado':
      return new Date(a.atualizadoEm ?? a.criadoEm).getTime() - new Date(b.atualizadoEm ?? b.criadoEm).getTime()
    default:
      return a.titulo.localeCompare(b.titulo, 'pt-BR', { numeric: true })
  }
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
  const { coluna: ordenarPor, direcao, aoClicarColuna } = useOrdenacaoClique<ColunaDocumento>('atualizado', 'desc')

  const [modalAberto, setModalAberto] = useState(false)
  const [documentoEditando, setDocumentoEditando] = useState<Documento | null>(null)
  const [documentoExcluindo, setDocumentoExcluindo] = useState<Documento | null>(null)
  const [documentoPrevia, setDocumentoPrevia] = useState<Documento | null>(null)

  const podeCriar = canGerenciarConteudo(usuario)
  // admin_setor só publica no próprio setor; superadmin em qualquer um.
  const setoresPermitidos = setoresParaPublicar(usuario, setores)

  const opcoesCategoria = [
    { valor: '', rotulo: 'Todas as categorias' },
    ...Object.entries(ROTULOS_CATEGORIA).map(([valor, rotulo]) => ({ valor, rotulo })),
  ]
  const opcoesSetor = [{ valor: '', rotulo: 'Todos os setores' }, ...setores.map((s) => ({ valor: s.id, rotulo: s.nome }))]

  // Título ou palavra-chave: cada palavra digitada precisa aparecer no
  // título, na descrição, no nome do arquivo ou na categoria.
  const documentosFiltrados = useMemo(() => {
    const palavras = normalizar(busca).split(/\s+/).filter(Boolean)
    const filtrados = palavras.length === 0
      ? documentos
      : documentos.filter((documento) => {
          const texto = normalizar(
            `${documento.titulo} ${documento.descricao ?? ''} ${documento.nomeArquivo} ${documento.setorNome} ${ROTULOS_CATEGORIA[documento.categoria]}`,
          )
          return palavras.every((palavra) => texto.includes(palavra))
        })
    return [...filtrados].sort((a, b) => {
      const resultado = compararDocumentos(a, b, ordenarPor)
      return direcao === 'desc' ? -resultado : resultado
    })
  }, [documentos, busca, ordenarPor, direcao])

  function podeGerenciarEste(documento: Documento) {
    return canEditar(usuario, { setorId: documento.setorId })
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
      <h1 className="m-0 mb-[22px] text-2xl font-semibold tracking-tight text-slate-900 liquido:font-display liquido:text-3xl liquido:font-bold">POPs &amp; documentos</h1>

      <div className="mb-5 flex flex-wrap items-stretch gap-3 sm:gap-3.5">
        <label className="relative block w-full sm:w-auto sm:flex-[0_1_320px]">
          <IconeLupa
            tamanho={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-500 liquido:left-4"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou palavra-chave"
            className="field h-full py-2.5 pl-[38px] text-[13.5px] liquido:capsule-field liquido:pl-10 liquido:text-sm"
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
          className={`hidden ${COLUNAS_TABELA} tabela-cabecalho px-[18px] py-3 text-xs font-medium tracking-wide uppercase liquido:font-semibold liquido:tracking-normal liquido:normal-case`}
        >
          <CabecalhoOrdenavel rotulo="Documento" ativo={ordenarPor === 'titulo'} direcao={direcao} aoClicar={() => aoClicarColuna('titulo')} />
          <CabecalhoOrdenavel rotulo="Categoria" ativo={ordenarPor === 'categoria'} direcao={direcao} aoClicar={() => aoClicarColuna('categoria')} />
          <CabecalhoOrdenavel rotulo="Atualizado" ativo={ordenarPor === 'atualizado'} direcao={direcao} aoClicar={() => aoClicarColuna('atualizado')} />
          <span>Ações</span>
        </div>

        {isLoading ? (
          <ul className="m-0 list-none p-0">
            {Array.from({ length: LINHAS_SKELETON }, (_, indice) => <LinhaSkeleton key={indice} indice={indice} />)}
          </ul>
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
          escolheSetor={canEscolherSetor(usuario)}
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
