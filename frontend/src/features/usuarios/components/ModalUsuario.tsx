import { useForm } from 'react-hook-form'
import { isAxiosError } from 'axios'
import type { Papel } from '../../../lib/auth/tipos'
import Botao from '../../../shared/components/Botao'
import Campo from '../../../shared/components/Campo'
import Input from '../../../shared/components/Input'
import Modal from '../../../shared/components/Modal'
import Select from '../../../shared/components/Select'
import type { SetorComRamais } from '../../setores/types'
import { mensagemErroUsuario, useSalvarUsuario } from '../hooks/useUsuarios'
import { ROTULOS_PAPEL, type DadosUsuario, type ErroUsuario, type UsuarioCadastro } from '../types'

interface ValoresFormulario {
  nome: string
  email: string
  role: Papel
  setorId: string
  dataNascimento: string
  ativo: boolean
}

interface Propriedades {
  usuarioEditando: UsuarioCadastro | null
  setores: SetorComRamais[]
  aoFechar: () => void
}

export default function ModalUsuario({ usuarioEditando, setores, aoFechar }: Propriedades) {
  const salvar = useSalvarUsuario()
  const { register, handleSubmit, setError, formState: { errors } } = useForm<ValoresFormulario>({
    defaultValues: {
      nome: usuarioEditando?.nome ?? '', email: usuarioEditando?.email ?? '',
      role: usuarioEditando?.role ?? 'comum', setorId: usuarioEditando?.setorId ?? '',
      dataNascimento: usuarioEditando?.dataNascimento ?? '', ativo: usuarioEditando?.ativo ?? true,
    },
  })

  async function enviar(valores: ValoresFormulario) {
    const dados: DadosUsuario = {
      nome: valores.nome.trim(), email: valores.email.trim(), role: valores.role,
      setorId: valores.setorId || null, dataNascimento: valores.dataNascimento || null,
    }
    try {
      await salvar.mutateAsync(usuarioEditando
        ? { tipo: 'editar', id: usuarioEditando.id, dados: { ...dados, ativo: valores.ativo } }
        : { tipo: 'criar', dados })
      aoFechar()
    } catch (erro: unknown) {
      if (isAxiosError<ErroUsuario>(erro)) {
        const campo = erro.response?.data?.campo
        if (campo === 'nome' || campo === 'email' || campo === 'role' || campo === 'ativo') {
          setError(campo, { message: mensagemErroUsuario(erro) })
        } else if (campo === 'setor_id' || campo === 'data_nascimento') {
          setError(campo === 'setor_id' ? 'setorId' : 'dataNascimento', { message: mensagemErroUsuario(erro) })
        }
      }
    }
  }

  function fechar() { if (!salvar.isPending) aoFechar() }

  return (
    <Modal aberto titulo={usuarioEditando ? 'Editar usuário' : 'Novo usuário'} aoFechar={fechar} largura="600px">
      <form onSubmit={handleSubmit(enviar)}>
        <fieldset disabled={salvar.isPending} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome completo" erro={errors.nome?.message} className="sm:col-span-2">
            <Input autoComplete="name" maxLength={200} {...register('nome', { required: 'Informe o nome.', validate: valor => !!valor.trim() || 'Informe o nome.', maxLength: 200 })} />
          </Campo>
          <Campo rotulo="E-mail" erro={errors.email?.message} className="sm:col-span-2">
            <Input type="email" autoComplete="email" maxLength={200} {...register('email', { required: 'Informe o e-mail.', maxLength: 200 })} />
          </Campo>
          {!usuarioEditando && <p className="text-sm text-slate-500 sm:col-span-2">
            O colaborador recebe neste e-mail um convite para criar a própria senha e confirmar os dados.
          </p>}
          <Campo rotulo="Perfil de acesso" erro={errors.role?.message}>
            <Select {...register('role')}>
              {Object.entries(ROTULOS_PAPEL).map(([valor, rotulo]) => <option key={valor} value={valor} >{rotulo}</option>)}
            </Select>
          </Campo>
          <Campo rotulo="Setor" erro={errors.setorId?.message}>
            <Select {...register('setorId')}>
              <option value="">Sem setor</option>
              {setores.map(setor => <option key={setor.id} value={setor.id}>{setor.nome}</option>)}
            </Select>
          </Campo>
          <Campo rotulo="Data de nascimento" erro={errors.dataNascimento?.message}>
            <Input type="date" {...register('dataNascimento')} />
          </Campo>
          {usuarioEditando && <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" {...register('ativo')} disabled={salvar.isPending} /> Usuário ativo
          </label>}
          {salvar.isError && <p role="alert" className="text-sm text-critical sm:col-span-2">{mensagemErroUsuario(salvar.error)}</p>}
          <div className="flex justify-end gap-2 border-t border-brand-100/60 pt-4 sm:col-span-2">
            <Botao onClick={fechar}>Cancelar</Botao>
            <Botao type="submit" variante="primario">{salvar.isPending ? 'Salvando…' : usuarioEditando ? 'Salvar alterações' : 'Criar usuário'}</Botao>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
