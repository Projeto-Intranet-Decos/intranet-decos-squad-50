import { formatarDataHora } from '../formatadores'
import { ROTULO_AREA, type Atividade } from '../types'

interface PropriedadesTabelaAtividades {
  atividades: Atividade[]
}

function TabelaAtividades({ atividades }: PropriedadesTabelaAtividades) {
  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead className="tabela-cabecalho">
            <tr className="text-xs font-medium tracking-wide uppercase liquido:tracking-normal liquido:normal-case">
              <th className="w-[19%] px-6 py-3.5 font-medium liquido:font-semibold">Data</th>
              <th className="w-[22%] px-6 py-3.5 font-medium liquido:font-semibold">Usuário</th>
              <th className="px-6 py-3.5 font-medium liquido:font-semibold">Ação</th>
              <th className="w-[16%] px-6 py-3.5 font-medium liquido:font-semibold">Área</th>
            </tr>
          </thead>
          <tbody>
            {atividades.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-600">
                  Nenhuma atividade encontrada.
                </td>
              </tr>
            ) : (
              atividades.map((atividade) => (
                <tr key={atividade.id} className="tabela-linha">
                  <td className="px-6 py-4 font-mono text-[13px] whitespace-nowrap text-slate-600 tabular-nums">
                    <time dateTime={atividade.criadoEm}>{formatarDataHora(atividade.criadoEm)}</time>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{atividade.usuarioNome}</td>
                  <td className="px-6 py-4">
                    <p className="m-0 text-sm text-slate-800">{atividade.acao}</p>
                    <p className="m-0 mt-0.5 text-[13px] text-slate-500">{atividade.detalhe}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block rounded-full bg-brand-50 px-2.5 py-1 text-xs whitespace-nowrap text-brand-700 ring-1 ring-brand-100 liquido:pill liquido:bg-brand-600/8 liquido:ring-brand-600/10">
                      {ROTULO_AREA[atividade.area]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TabelaAtividades
