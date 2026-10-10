import { useId } from 'react'
import Botao from '../../shared/components/Botao'
import { LIMITES, definirPreferencias, restaurarPreferencias, type GradienteFundo } from './preferencias'
import { usePreferencias } from './usePreferencias'

const GRADIENTES: { valor: GradienteFundo; rotulo: string }[] = [
  { valor: 'desligado', rotulo: 'Desligado' },
  { valor: 'suave', rotulo: 'Suave' },
  { valor: 'intenso', rotulo: 'Intenso' },
]

interface PropriedadesDeslizante {
  rotulo: string
  ajuda: string
  valor: number
  unidade: string
  limite: { minimo: number; maximo: number }
  passo?: number
  aoMudar: (valor: number) => void
}

function Deslizante({ rotulo, ajuda, valor, unidade, limite, passo = 1, aoMudar }: PropriedadesDeslizante) {
  const id = useId()
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {rotulo}
        </label>
        <span className="text-sm text-slate-600 tabular-nums">
          {valor}
          {unidade}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={limite.minimo}
        max={limite.maximo}
        step={passo}
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        aria-describedby={`${id}-ajuda`}
        className="h-10 w-full cursor-pointer accent-brand-600"
      />
      <p id={`${id}-ajuda`} className="m-0 text-xs text-slate-500">
        {ajuda}
      </p>
    </div>
  )
}

interface PropriedadesInterruptor {
  rotulo: string
  ajuda: string
  ligado: boolean
  aoMudar: (ligado: boolean) => void
}

function Interruptor({ rotulo, ajuda, ligado, aoMudar }: PropriedadesInterruptor) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-slate-700">
          {rotulo}
        </label>
        <p id={`${id}-ajuda`} className="m-0 text-xs text-slate-500">
          {ajuda}
        </p>
      </div>
      <span className="relative flex h-6 w-11 flex-none">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={ligado}
          onChange={(e) => aoMudar(e.target.checked)}
          aria-describedby={`${id}-ajuda`}
          className="peer size-full cursor-pointer appearance-none rounded-full bg-slate-400 transition-colors checked:bg-brand-600"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5"
        />
      </span>
    </div>
  )
}

function PaginaConfiguracoes() {
  const preferencias = usePreferencias()

  return (
    <div className="max-w-[720px]">
      <div className="mb-6">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-slate-900">Configurações</h1>
        <p className="m-0 mt-1.5 text-sm text-slate-600">
          Ajustes de aparência da intranet. Valem na hora e ficam salvos neste navegador.
        </p>
      </div>

      <section className="surface mb-5 p-5 sm:p-6">
        <h2 className="m-0 mb-4 text-base font-semibold text-slate-900">Vidro</h2>
        <div className="flex flex-col gap-5">
          <Deslizante
            rotulo="Desfoque do vidro"
            ajuda="O quanto o fundo fica borrado atrás do menu e dos painéis. Em 0 o desfoque é desligado, o que deixa a página mais leve em computadores antigos."
            valor={preferencias.desfoque}
            unidade=" px"
            limite={LIMITES.desfoque}
            aoMudar={(desfoque) => definirPreferencias({ desfoque })}
          />
          <Deslizante
            rotulo="Transparência do vidro"
            ajuda="O quanto do fundo aparece através do menu e dos painéis. Em 0 as superfícies ficam sólidas."
            valor={preferencias.transparencia}
            unidade="%"
            limite={LIMITES.transparencia}
            passo={5}
            aoMudar={(transparencia) => definirPreferencias({ transparencia })}
          />
        </div>
      </section>

      <section className="surface mb-5 p-5 sm:p-6">
        <h2 className="m-0 mb-4 text-base font-semibold text-slate-900">Fundo e movimento</h2>

        <fieldset className="m-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-0 p-0 pb-3.5">
          <legend className="float-left p-0 text-sm font-medium text-slate-700">Gradiente de fundo</legend>
          <div className="flex gap-[3px] rounded-[10px] bg-slate-900/5 p-[3px]">
            {GRADIENTES.map((opcao) => (
              <label
                key={opcao.valor}
                className={`flex min-h-10 cursor-pointer items-center rounded-lg px-[13px] text-[13px] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-500 sm:min-h-8 ${
                  opcao.valor === preferencias.gradiente
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <input
                  type="radio"
                  name="gradiente"
                  value={opcao.valor}
                  checked={opcao.valor === preferencias.gradiente}
                  onChange={() => definirPreferencias({ gradiente: opcao.valor })}
                  className="sr-only"
                />
                {opcao.rotulo}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="divide-y divide-slate-200/60 border-t border-slate-200/60">
          <Interruptor
            rotulo="Efeito elástico na rolagem"
            ajuda="Ao rolar além do topo ou do fim da página, o conteúdo estica e volta ao lugar."
            ligado={preferencias.rolagemElastica}
            aoMudar={(rolagemElastica) => definirPreferencias({ rolagemElastica })}
          />
          <Interruptor
            rotulo="Reduzir animações"
            ajuda="Tira transições e animações da interface, inclusive o efeito elástico."
            ligado={preferencias.reduzirAnimacoes}
            aoMudar={(reduzirAnimacoes) => definirPreferencias({ reduzirAnimacoes })}
          />
        </div>
      </section>

      <Botao onClick={restaurarPreferencias} className="w-full sm:w-auto">
        Restaurar padrão
      </Botao>
    </div>
  )
}

export default PaginaConfiguracoes
