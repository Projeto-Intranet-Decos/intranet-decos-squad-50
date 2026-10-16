import { useRef, useState, type DragEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import Botao from '../../../shared/components/Botao'
import Campo from '../../../shared/components/Campo'
import Input from '../../../shared/components/Input'
import Modal from '../../../shared/components/Modal'
import Select from '../../../shared/components/Select'
import { IconeNuvemEnviar } from '../../../shared/components/icones'
import { formatarTamanho } from '../formatadores'
import { useSalvarDocumento } from '../hooks/useSalvarDocumento'
import { ROTULOS_CATEGORIA, type CategoriaDocumento, type Documento, type Setor } from '../types'

// Espelha TIPOS_DOCUMENTO e tamanho_maximo_upload_mb do backend; a validação
// real é lá, aqui é só pra avisar antes de subir o arquivo.
const TAMANHO_MAXIMO_MB = 50
const EXTENSOES_ACEITAS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'txt', 'png', 'jpg', 'jpeg',
]

interface ValoresFormularioDocumento {
  titulo: string
  descricao: string
  categoria: CategoriaDocumento
  setorId: string
}

interface PropriedadesModalDocumento {
  aoFechar: () => void
  documentoEditando: Documento | null
  setores: Setor[]
  /** superadmin escolhe o setor; admin_setor publica sempre no próprio. */
  escolheSetor: boolean
}

function validarArquivo(arquivo: File): string | null {
  const extensao = arquivo.name.split('.').pop()?.toLowerCase() ?? ''
  if (!EXTENSOES_ACEITAS.includes(extensao)) return 'Formato não aceito.'
  if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) return `Arquivo maior que ${TAMANHO_MAXIMO_MB} MB.`
  return null
}

// Remontado do zero a cada abertura (key trocada pelo pai), como em
// features/murais/components/ModalAviso.tsx.
function ModalDocumento({ aoFechar, documentoEditando, setores, escolheSetor }: PropriedadesModalDocumento) {
  const editando = !!documentoEditando
  const salvarDocumento = useSalvarDocumento()
  const entradaArquivo = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ValoresFormularioDocumento>({
    defaultValues: {
      titulo: documentoEditando?.titulo ?? '',
      descricao: documentoEditando?.descricao ?? '',
      categoria: documentoEditando?.categoria ?? 'outro',
      setorId: documentoEditando?.setorId ?? setores[0]?.id ?? '',
    },
  })

  const titulo = useWatch({ control, name: 'titulo' })
  const valido = !!titulo?.trim() && (editando || !!arquivo)

  function selecionarArquivo(novo: File | undefined) {
    if (!novo) return
    const erro = validarArquivo(novo)
    setErroArquivo(erro)
    setArquivo(erro ? null : novo)
  }

  function aoSoltar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault()
    setArrastando(false)
    selecionarArquivo(evento.dataTransfer.files[0])
  }

  function aoSubmeter(valores: ValoresFormularioDocumento) {
    const titulo = valores.titulo.trim()
    const descricao = valores.descricao.trim()
    const { categoria } = valores
    if (documentoEditando) {
      salvarDocumento.mutate(
        { id: documentoEditando.id, dados: { titulo, descricao: descricao || null, categoria }, arquivo },
        { onSuccess: aoFechar },
      )
    } else if (arquivo) {
      salvarDocumento.mutate(
        {
          dados: {
            titulo,
            descricao: descricao || undefined,
            categoria,
            setorId: escolheSetor ? valores.setorId : undefined,
            arquivo,
          },
        },
        { onSuccess: aoFechar },
      )
    }
  }

  const textoArquivo = arquivo
    ? `${arquivo.name} · ${formatarTamanho(arquivo.size)}`
    : editando
      ? `Arquivo atual: ${documentoEditando.nomeArquivo}`
      : null

  return (
    <Modal aberto titulo={editando ? 'Editar documento' : 'Enviar documento'} aoFechar={aoFechar}>
      <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => entradaArquivo.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && entradaArquivo.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={aoSoltar}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] ios:rounded-inner border border-dashed px-4 py-8 text-center sm:px-6 sm:py-10 transition-colors ${
            arrastando ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white/55 hover:bg-white/75'
          }`}
        >
          <IconeNuvemEnviar tamanho={32} className="mb-1 text-brand-600" />
          <span className="text-[15px] font-semibold text-slate-900">
            {textoArquivo ?? 'Arraste arquivos para enviar'}
          </span>
          <span className="text-[13px] text-slate-600">
            {textoArquivo
              ? 'Clique ou arraste outro arquivo para substituir'
              : `PDF, Office, texto ou imagem até ${TAMANHO_MAXIMO_MB} MB · ou clique para selecionar do computador`}
          </span>
          {erroArquivo && <span className="text-xs text-critical">{erroArquivo}</span>}
          <input
            ref={entradaArquivo}
            type="file"
            accept={EXTENSOES_ACEITAS.map((e) => `.${e}`).join(',')}
            className="hidden"
            onChange={(e) => selecionarArquivo(e.target.files?.[0])}
          />
        </div>

        <Campo rotulo="Título" erro={errors.titulo?.message}>
          <Input
            placeholder="Ex.: Higienização das mãos"
            {...register('titulo', { required: 'Informe o título.' })}
          />
        </Campo>

        <Campo rotulo="Descrição">
          <Input placeholder="Opcional" {...register('descricao')} />
        </Campo>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Campo rotulo="Categoria" className="w-full sm:w-1/2">
            <Select {...register('categoria')}>
              {Object.entries(ROTULOS_CATEGORIA).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Select>
          </Campo>

          {!editando && escolheSetor && (
            <Campo rotulo="Setor" className="w-full sm:w-1/2">
              <Select {...register('setorId')}>
                {setores.map((setor) => (
                  <option key={setor.id} value={setor.id}>
                    {setor.nome}
                  </option>
                ))}
              </Select>
            </Campo>
          )}
        </div>

        <div className="mt-2 grid gap-2.5 border-t border-slate-200/60 ios:border-slate-900/5 pt-[18px] sm:flex sm:justify-end">
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="primario" disabled={!valido || salvarDocumento.isPending}>
            {salvarDocumento.isPending ? 'Enviando…' : editando ? 'Salvar alterações' : 'Publicar documento'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}

export default ModalDocumento
