import { useForm, useWatch } from 'react-hook-form'
import Botao from '../../../shared/components/Botao'
import Campo from '../../../shared/components/Campo'
import Input from '../../../shared/components/Input'
import Modal from '../../../shared/components/Modal'
import { useSalvarSetor } from '../hooks/useSalvarSetor'
import type { SetorComRamais } from '../types'

interface ValoresFormularioSetor {
  nome: string
  ramais: string
}

interface PropriedadesModalSetor {
  aoFechar: () => void
  setorEditando: SetorComRamais | null
  podeRenomear: boolean
}

const PADRAO_RAMAL = /^[0-9()+\- ]+$/
const TAMANHO_MAXIMO_RAMAL = 20

function separarRamais(texto: string): string[] {
  return [...new Set(texto.split(',').map((numero) => numero.trim()).filter(Boolean))]
}

function validarRamais(texto: string): true | string {
  const invalido = separarRamais(texto).find(
    (numero) => !PADRAO_RAMAL.test(numero) || numero.length > TAMANHO_MAXIMO_RAMAL,
  )
  return invalido
    ? `Ramal inválido: "${invalido}". Use só números, espaços e ( ) + -, com até 20 caracteres.`
    : true
}

function ModalSetor({ aoFechar, setorEditando, podeRenomear }: PropriedadesModalSetor) {
  const editando = !!setorEditando
  const salvarSetor = useSalvarSetor()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ValoresFormularioSetor>({
    defaultValues: {
      nome: setorEditando?.nome ?? '',
      ramais: setorEditando?.ramais.map((ramal) => ramal.numero).join(', ') ?? '',
    },
  })

  const nome = useWatch({ control, name: 'nome' })
  const valido = !!nome?.trim()

  function aoSubmeter(valores: ValoresFormularioSetor) {
    salvarSetor.mutate(
      { setorEditando, nome: valores.nome.trim(), numeros: separarRamais(valores.ramais) },
      { onSuccess: aoFechar },
    )
  }

  return (
    <Modal aberto titulo={editando ? 'Editar setor' : 'Novo setor'} aoFechar={aoFechar} largura="520px">
      <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-4">
        <Campo rotulo="Nome do setor" erro={errors.nome?.message}>
          <Input
            placeholder="Ex.: Nutrição clínica"
            readOnly={!podeRenomear}
            className={podeRenomear ? '' : 'cursor-not-allowed bg-slate-900/5 text-slate-500'}
            {...register('nome', { required: 'Informe o nome do setor.' })}
          />
        </Campo>

        <Campo rotulo="Ramais" erro={errors.ramais?.message}>
          <Input placeholder="Ex.: 2320, 2321" {...register('ramais', { validate: validarRamais })} />
        </Campo>

        <div className="mt-2 grid gap-2.5 border-t border-slate-200/60 ios:border-slate-900/5 pt-[18px] sm:flex sm:justify-end">
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" disabled={!valido || salvarSetor.isPending}>
            {editando ? 'Salvar alterações' : 'Criar setor'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}

export default ModalSetor
