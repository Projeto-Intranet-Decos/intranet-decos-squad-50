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
          <thead className="border-b border-slate-200/60 bg-white/40 text-slate-500 ios:border-slate-900/5 ios:bg-white/35">
            <tr className="text-xs font-medium tracking-wide uppercase ios:tracking-normal ios:normal-case">
              <th className="w-[19%] px-6 py-3.5 font-medium ios:font-semibold">Data</th>
              <th className="w-[22%] px-6 py-3.5 font-medium ios:font-semibold">Usuário</th>
              <th className="px-6 py-3.5 font-medium ios:font-semibold">Ação</th>
              <th className="w-[16%] px-6 py-3.5 font-medium ios:font-semibold">Área</th>
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
                <tr key={atividade.id} className="border-b border-slate-200/60 ios:border-slate-900/5 transition-colors last:border-b-0 hover:bg-white/60 ios:hover:bg-white/50">
                  <td className="px-6 py-4 font-mono text-[13px] whitespace-nowrap text-slate-600 tabular-nums">
                    <time dateTime={atividade.criadoEm}>{formatarDataHora(atividade.criadoEm)}</time>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{atividade.usuarioNome}</td>
                  <td className="px-6 py-4">
                    <p className="m-0 text-sm text-slate-800">{atividade.acao}</p>
                    <p className="m-0 mt-0.5 text-[13px] text-slate-500">{atividade.detalhe}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs whitespace-nowrap text-slate-700 ring-1 ring-slate-200 ios:pill ios:bg-slate-900/5 ios:ring-slate-900/5">
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
