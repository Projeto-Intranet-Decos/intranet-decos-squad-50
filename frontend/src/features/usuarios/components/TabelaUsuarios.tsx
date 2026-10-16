import { IconeLapis, IconeLixeira } from '../../../shared/components/icones'
import Botao from '../../../shared/components/Botao'
import { ROTULOS_PAPEL, type UsuarioCadastro } from '../types'

interface Propriedades {
  usuarios: UsuarioCadastro[]
  setores: Map<string, string>
  edicaoDisponivel: boolean
  aoEditar: (usuario: UsuarioCadastro) => void
  aoExcluir: (usuario: UsuarioCadastro) => void
}

export default function TabelaUsuarios({ usuarios, setores, edicaoDisponivel, aoEditar, aoExcluir }: Propriedades) {
  return (
    <div className="surface overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Usuários da Intranet Decós</caption>
        <thead className="tabela-cabecalho text-xs font-medium uppercase liquido:normal-case">
          <tr>{['Usuário', 'Perfil', 'Setor', 'Status', 'Ações'].map(titulo => <th key={titulo} scope="col" className="px-4 py-3">{titulo}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-brand-100/50">
          {usuarios.map(usuario => <tr key={usuario.id} className="tabela-linha">
            <td className="px-4 py-3"><span className="font-medium text-slate-800">{usuario.nome}</span><span className="block text-xs text-slate-500">{usuario.email}</span></td>
            <td className="px-4 py-3 text-slate-600">{ROTULOS_PAPEL[usuario.role]}</td>
            <td className="px-4 py-3 text-slate-600">{usuario.setorId ? setores.get(usuario.setorId) ?? 'Setor indisponível' : 'Sem setor'}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${usuario.ativo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{usuario.ativo ? 'Ativo' : 'Inativo'}</span></td>
            <td className="px-4 py-3"><div className="flex gap-1">
              <Botao variante="icone" disabled={!edicaoDisponivel} title={edicaoDisponivel ? "Editar usuário" : "Aguarde o carregamento dos setores"} aria-label={`Editar ${usuario.nome}`} onClick={() => aoEditar(usuario)}><IconeLapis tamanho={18} /></Botao>
              <Botao variante="icone" title="Excluir (desativar) usuário" aria-label={`Excluir ${usuario.nome}`} disabled={!usuario.ativo} onClick={() => aoExcluir(usuario)}><IconeLixeira tamanho={18} /></Botao>
            </div></td>
          </tr>)}
          {!usuarios.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Nenhum usuário encontrado com esses filtros.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
