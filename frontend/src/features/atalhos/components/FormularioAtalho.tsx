import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { IconeCheck, IconeX } from '../../../shared/components/icones'
import type { ErroCampo } from '../../../shared/types'
import { useSalvarAtalho } from '../hooks/useSalvarAtalho'
import type { DadosAtalho } from '../types'

interface PropriedadesFormularioAtalho {
  id: string | null
  inicial?: DadosAtalho
  aoConcluir: () => void
}

const CLASSE_CAMPO = 'field px-2.5 py-1.5 text-[13px] aria-invalid:border-danger-500 liquido:text-sm'

const CLASSE_BOTAO =
  'flex size-8 flex-none items-center justify-center rounded-lg transition-[color,background-color,scale] lg:size-7 liquido:rounded-full liquido:active:scale-[0.94]'

// Criação/edição inline na barra lateral (ATA-05): Enter salva, Esc cancela.
function FormularioAtalho({ id, inicial, aoConcluir }: PropriedadesFormularioAtalho) {
  const salvar = useSalvarAtalho()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DadosAtalho>({
    defaultValues: { titulo: inicial?.titulo ?? '', url: inicial?.url ?? '' },
  })

  function aoEnviar(dados: DadosAtalho) {
    salvar.mutate(
      { id, dados: { titulo: dados.titulo.trim(), url: dados.url.trim() } },
      {
        onSuccess: aoConcluir,
        onError: (erro) => {
          const corpo = isAxiosError<ErroCampo>(erro) ? erro.response?.data : undefined
          if (corpo?.campo === 'titulo' || corpo?.campo === 'url') {
            setError(corpo.campo, { message: corpo.mensagem })
          }
          toast.error(corpo?.mensagem ?? 'Erro ao salvar o atalho. Tente novamente.')
        },
      },
    )
  }

  return (
    <form
      onSubmit={handleSubmit(aoEnviar)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          aoConcluir()
        }
      }}
      className="flex flex-col gap-1.5 rounded-xl bg-white/55 p-2 ring-1 ring-white/70 liquido:rounded-2xl liquido:bg-white/40 liquido:ring-slate-900/5"
    >
      <input
        autoFocus
        placeholder="Nome"
        aria-label="Nome do atalho"
        aria-invalid={errors.titulo ? true : undefined}
        maxLength={100}
        className={CLASSE_CAMPO}
        {...register('titulo', {
          validate: (valor) => valor.trim() !== '' || 'Informe o nome.',
        })}
      />
      {errors.titulo && <span className="px-0.5 text-xs text-critical">{errors.titulo.message}</span>}
      <input
        placeholder="https://..."
        aria-label="URL do atalho"
        aria-invalid={errors.url ? true : undefined}
        maxLength={500}
        className={CLASSE_CAMPO}
        {...register('url', {
          validate: (valor) => /^https?:\/\//i.test(valor.trim()) || 'Use um endereço com http:// ou https://',
        })}
      />
      {errors.url && <span className="px-0.5 text-xs text-critical">{errors.url.message}</span>}
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={aoConcluir}
          title="Cancelar (Esc)"
          aria-label="Cancelar"
          className={`${CLASSE_BOTAO} text-slate-500 hover:bg-white/80 hover:text-slate-700`}
        >
          <IconeX tamanho={15} />
        </button>
        <button
          type="submit"
          disabled={salvar.isPending}
          title="Salvar (Enter)"
          aria-label="Salvar"
          className={`${CLASSE_BOTAO} bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 liquido:bg-linear-to-b liquido:from-[#8f0a2c] liquido:to-brand-600 liquido:shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]`}
        >
          <IconeCheck tamanho={15} />
        </button>
      </div>
    </form>
  )
}

export default FormularioAtalho
