import CabecalhoOrdenavel from '../../../shared/components/CabecalhoOrdenavel'
import { IconeLapis, IconeLixeira, IconeReenviar } from '../../../shared/components/icones'
import Botao from '../../../shared/components/Botao'
import Skeleton from '../../../shared/components/Skeleton'
import type { DirecaoOrdenacao } from '../../../shared/hooks/useOrdenacaoClique'
import { ROTULOS_PAPEL, ROTULOS_SITUACAO, situacaoDoUsuario, type ColunaUsuario, type SituacaoUsuario, type UsuarioCadastro } from '../types'

const ESTILOS_SITUACAO: Record<SituacaoUsuario, string> = {
  ativo: 'bg-green-50 text-green-700', pendente: 'bg-amber-50 text-amber-800', inativo: 'bg-slate-100 text-slate-500',
}

interface Propriedades {
  usuarios: UsuarioCadastro[]
  isLoading: boolean
  setores: Map<string, string>
  ordenarPor: ColunaUsuario
  direcao: DirecaoOrdenacao
  aoClicarColuna: (coluna: ColunaUsuario) => void
  edicaoDisponivel: boolean
  aoEditar: (usuario: UsuarioCadastro) => void
  aoExcluir: (usuario: UsuarioCadastro) => void
  reenvioEmAndamento: boolean
  aoReenviarConvite: (usuario: UsuarioCadastro) => void
}

const COLUNAS: { coluna: ColunaUsuario; titulo: string }[] = [
  { coluna: 'nome', titulo: 'Usuário' },
  { coluna: 'perfil', titulo: 'Perfil' },
  { coluna: 'setor', titulo: 'Setor' },
  { coluna: 'status', titulo: 'Status' },
]

const LINHAS_SKELETON = 6

function LinhaSkeleton({ indice }: { indice: number }) {
  return (
    <tr>
      <td className="px-4 py-3"><Skeleton className={`h-4 ${indice % 2 === 0 ? 'w-36' : 'w-28'}`} /><Skeleton className="mt-1.5 h-3 w-40" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
      <td className="px-4 py-3"><div className="flex gap-1"><Skeleton className="size-8 rounded-lg" /><Skeleton className="size-8 rounded-lg" /></div></td>
    </tr>
  )
}

export default function TabelaUsuarios({ usuarios, isLoading, setores, ordenarPor, direcao, aoClicarColuna, edicaoDisponivel, aoEditar, aoExcluir, reenvioEmAndamento, aoReenviarConvite }: Propriedades) {
  return (
    <div className="surface overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Usuários da Intranet Decós</caption>
        <thead className="tabela-cabecalho text-xs font-medium uppercase liquido:normal-case">
          <tr>
            {COLUNAS.map(({ coluna, titulo }) => (
              <th key={coluna} scope="col" aria-sort={ordenarPor === coluna ? (direcao === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3">
                <CabecalhoOrdenavel rotulo={titulo} ativo={ordenarPor === coluna} direcao={direcao} aoClicar={() => aoClicarColuna(coluna)} />
              </th>
            ))}
            <th scope="col" className="px-4 py-3">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-100/50">
          {isLoading && Array.from({ length: LINHAS_SKELETON }, (_, indice) => <LinhaSkeleton key={indice} indice={indice} />)}
          {!isLoading && usuarios.map(usuario => { const situacao = situacaoDoUsuario(usuario); return <tr key={usuario.id} className="tabela-linha">
            <td className="px-4 py-3"><span className="font-medium text-slate-800">{usuario.nome}</span><span className="block text-xs text-slate-500">{usuario.email}</span></td>
            <td className="px-4 py-3 text-slate-600">{ROTULOS_PAPEL[usuario.role]}</td>
            <td className="px-4 py-3 text-slate-600">{usuario.setorId ? setores.get(usuario.setorId) ?? 'Setor indisponível' : 'Sem setor'}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs whitespace-nowrap ${ESTILOS_SITUACAO[situacao]}`}>{ROTULOS_SITUACAO[situacao]}</span></td>
            <td className="px-4 py-3"><div className="flex gap-1">
              {situacao === 'pendente' && <Botao variante="icone" disabled={reenvioEmAndamento} title="Reenviar convite" aria-label={`Reenviar convite para ${usuario.nome}`} onClick={() => aoReenviarConvite(usuario)}><IconeReenviar tamanho={18} /></Botao>}
              <Botao variante="icone" disabled={!edicaoDisponivel} title={edicaoDisponivel ? "Editar usuário" : "Aguarde o carregamento dos setores"} aria-label={`Editar ${usuario.nome}`} onClick={() => aoEditar(usuario)}><IconeLapis tamanho={18} /></Botao>
              <Botao variante="icone" title="Excluir (desativar) usuário" aria-label={`Excluir ${usuario.nome}`} disabled={!usuario.ativo} onClick={() => aoExcluir(usuario)}><IconeLixeira tamanho={18} /></Botao>
            </div></td>
          </tr> })}
          {!isLoading && !usuarios.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Nenhum usuário encontrado com esses filtros.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
