import { useForm, useWatch } from 'react-hook-form'
import Botao from '../../../shared/components/Botao'
import Campo from '../../../shared/components/Campo'
import Input from '../../../shared/components/Input'
import Modal from '../../../shared/components/Modal'
import Select from '../../../shared/components/Select'
import Textarea from '../../../shared/components/Textarea'
import { useSalvarFaq } from '../hooks/useSalvarFaq'
import type { Faq, Setor } from '../types'

interface ValoresFormularioFaq {
  pergunta: string
  resposta: string
  setorId: string
}

interface PropriedadesModalFaq {
  aoFechar: () => void
  faqEditando: Faq | null
  setores: Setor[]
  /** superadmin escolhe o setor; admin_setor publica sempre no próprio. */
  escolheSetor: boolean
}

// Remontado do zero a cada abertura (key trocada pelo pai), como em
// features/murais/components/ModalAviso.tsx — evita resetar o formulário
// via setState em efeito.
function ModalFaq({ aoFechar, faqEditando, setores, escolheSetor }: PropriedadesModalFaq) {
  const editando = !!faqEditando
  const salvarFaq = useSalvarFaq()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ValoresFormularioFaq>({
    defaultValues: {
      pergunta: faqEditando?.pergunta ?? '',
      resposta: faqEditando?.resposta ?? '',
      setorId: faqEditando?.setorId ?? setores[0]?.id ?? '',
    },
  })

  const [pergunta, resposta] = useWatch({ control, name: ['pergunta', 'resposta'] })
  const valido = !!pergunta?.trim() && !!resposta?.trim()

  function aoSubmeter(valores: ValoresFormularioFaq) {
    const pergunta = valores.pergunta.trim()
    const resposta = valores.resposta.trim()
    if (faqEditando) {
      salvarFaq.mutate({ id: faqEditando.id, dados: { pergunta, resposta } }, { onSuccess: aoFechar })
    } else {
      salvarFaq.mutate(
        { dados: { pergunta, resposta, ...(escolheSetor ? { setorId: valores.setorId } : {}) } },
        { onSuccess: aoFechar },
      )
    }
  }

  return (
    <Modal aberto titulo={editando ? 'Editar pergunta' : 'Nova dúvida'} aoFechar={aoFechar}>
      <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-4">
        <Campo rotulo="Pergunta" erro={errors.pergunta?.message}>
          <Input
            placeholder="Ex.: Como solicito minhas férias?"
            {...register('pergunta', { required: 'Informe a pergunta.' })}
          />
        </Campo>

        {!editando && escolheSetor && (
          <Campo rotulo="Setor">
            <Select {...register('setorId')}>
              {setores.map((setor) => (
                <option key={setor.id} value={setor.id}>
                  {setor.nome}
                </option>
              ))}
            </Select>
          </Campo>
        )}

        <Campo rotulo="Resposta" erro={errors.resposta?.message}>
          <Textarea
            className="h-[132px]"
            placeholder="Escreva a resposta…"
            {...register('resposta', { required: 'Escreva a resposta.' })}
          />
        </Campo>

        <div className="mt-2 grid gap-2.5 border-t border-slate-200/60 liquido:border-slate-900/5 pt-[18px] sm:flex sm:justify-end">
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" disabled={!valido || salvarFaq.isPending}>
            {editando ? 'Salvar alterações' : 'Publicar pergunta'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}

export default ModalFaq
