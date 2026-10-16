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

const CLASSE_CAMPO =
  'w-full rounded-md border bg-white px-2 py-1.5 text-[12.5px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#800020]'

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
      className="flex flex-col gap-1.5 rounded-[10px] bg-slate-50 p-2"
    >
      <input
        autoFocus
        placeholder="Nome"
        aria-label="Nome do atalho"
        maxLength={100}
        className={`${CLASSE_CAMPO} ${errors.titulo ? 'border-red-400' : 'border-slate-200'}`}
        {...register('titulo', {
          validate: (valor) => valor.trim() !== '' || 'Informe o nome.',
        })}
      />
      {errors.titulo && <span className="px-0.5 text-[11px] text-red-600">{errors.titulo.message}</span>}
      <input
        placeholder="https://..."
        aria-label="URL do atalho"
        maxLength={500}
        className={`${CLASSE_CAMPO} ${errors.url ? 'border-red-400' : 'border-slate-200'}`}
        {...register('url', {
          validate: (valor) => /^https?:\/\//i.test(valor.trim()) || 'Use um endereço com http:// ou https://',
        })}
      />
      {errors.url && <span className="px-0.5 text-[11px] text-red-600">{errors.url.message}</span>}
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={aoConcluir}
          title="Cancelar (Esc)"
          aria-label="Cancelar"
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600"
        >
          <IconeX tamanho={15} />
        </button>
        <button
          type="submit"
          disabled={salvar.isPending}
          title="Salvar (Enter)"
          aria-label="Salvar"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-[#800020] text-white hover:bg-[#6a001a] disabled:opacity-60"
        >
          <IconeCheck tamanho={15} />
        </button>
      </div>
    </form>
  )
}

export default FormularioAtalho
