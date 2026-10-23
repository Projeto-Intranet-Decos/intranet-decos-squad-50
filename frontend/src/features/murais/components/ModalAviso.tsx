import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import Botao from '../../../shared/components/Botao'
import Campo from '../../../shared/components/Campo'
import Input from '../../../shared/components/Input'
import Modal from '../../../shared/components/Modal'
import Select from '../../../shared/components/Select'
import Textarea from '../../../shared/components/Textarea'
import { IconeArquivoTexto, IconeClipe, IconeImagem, IconeX } from '../../../shared/components/icones'
import type { Usuario } from '../../../lib/auth/tipos'
import { canEscolherSetor } from '../../../lib/permissions'
import { useSalvarAviso } from '../hooks/useSalvarAviso'
import { formatarTamanhoArquivo } from '../formatadores'
import { combinarDataHora, separarDataHora } from '../formatadoresCalendario'
import {
  EXTENSOES_ANEXO,
  LIMITE_IMAGEM_MB,
  LIMITE_UPLOAD_MB,
  MAXIMO_ANEXOS,
  ROTULO_CATEGORIA,
  TIPOS_IMAGEM,
  type Aviso,
  type CategoriaAviso,
  type Setor,
} from '../types'

const MB = 1024 * 1024

interface ValoresFormularioAviso {
  titulo: string
  conteudo: string
  categoria: CategoriaAviso
  setorId: string
  fixado: boolean
  // Só em evento. Data no formato do <input type="date">, hora no do <input type="time">.
  dataInicio: string
  horaInicio: string
  dataFim: string
  horaFim: string
}

/** Término do evento: hora sem data é no mesmo dia do início; data sem hora vai até 23:59. */
function montarFim(valores: ValoresFormularioAviso): string | null {
  if (!valores.dataFim && !valores.horaFim) return null
  return combinarDataHora(valores.dataFim || valores.dataInicio, valores.horaFim || '23:59')
}

/** Anexo que já está no backend (`id`) ou que ainda vai ser enviado (`arquivo`). */
type AnexoLocal =
  | { id: string; nome: string; tamanho: string; arquivo?: undefined }
  | { id?: undefined; nome: string; tamanho: string; arquivo: File }

function extensao(nome: string) {
  const ponto = nome.lastIndexOf('.')
  return ponto === -1 ? '' : nome.slice(ponto).toLowerCase()
}

interface PropriedadesModalAviso {
  aoFechar: () => void
  avisoEditando: Aviso | null
  setores: Setor[]
  usuario: Usuario | null
}

// Este componente só é montado enquanto o modal está aberto — quem
// controla isso é o pai (PaginaMural), que também troca a `key` a cada
// abertura para remontar o formulário do zero (evita resetar estado local
// via setState dentro de efeito, que causa re-renders em cascata).
function ModalAviso({ aoFechar, avisoEditando, setores, usuario }: PropriedadesModalAviso) {
  const editando = !!avisoEditando
  // O backend não troca o setor de um aviso existente (AvisoAtualizar não tem setor_id).
  const setorTravado = !canEscolherSetor(usuario) || editando
  const salvarAviso = useSalvarAviso()
  const inputArquivoRef = useRef<HTMLInputElement>(null)
  const inputImagemRef = useRef<HTMLInputElement>(null)
  const [anexos, setAnexos] = useState<AnexoLocal[]>(
    () => avisoEditando?.anexos.map((a) => ({ id: a.id, nome: a.nome, tamanho: a.tamanho })) ?? [],
  )
  const [anexosRemovidos, setAnexosRemovidos] = useState<string[]>([])
  const [arrastando, setArrastando] = useState(false)

  // A URL da pré-visualização nasce e morre nos handlers; o ref cobre o desmonte do modal.
  const [imagemNova, setImagemNova] = useState<{ arquivo: File; url: string } | null>(null)
  const [removerImagemAtual, setRemoverImagemAtual] = useState(false)
  const urlPreviaRef = useRef<string | null>(null)
  useEffect(
    () => () => {
      if (urlPreviaRef.current) URL.revokeObjectURL(urlPreviaRef.current)
    },
    [],
  )
  const urlImagemExibida =
    imagemNova?.url ?? (removerImagemAtual ? null : (avisoEditando?.urlImagem ?? null))

  const inicioAtual = avisoEditando?.dataInicio ? separarDataHora(avisoEditando.dataInicio) : null
  const fimAtual = avisoEditando?.dataFim ? separarDataHora(avisoEditando.dataFim) : null
  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors },
  } = useForm<ValoresFormularioAviso>({
    defaultValues: {
      titulo: avisoEditando?.titulo ?? '',
      conteudo: avisoEditando?.conteudo ?? '',
      categoria: avisoEditando?.categoria ?? 'comunicado',
      setorId: avisoEditando?.setorId ?? usuario?.setorId ?? setores[0]?.id ?? '',
      fixado: avisoEditando?.fixado ?? false,
      dataInicio: inicioAtual?.data ?? '',
      horaInicio: inicioAtual?.hora ?? '',
      dataFim: fimAtual?.data ?? '',
      horaFim: fimAtual?.hora ?? '',
    },
  })

  const [titulo, conteudo, categoria, dataInicio, horaInicio] = useWatch({
    control,
    name: ['titulo', 'conteudo', 'categoria', 'dataInicio', 'horaInicio'],
  })
  const ehEvento = categoria === 'evento'
  // Conteúdo é opcional em evento; em evento, a data e a hora de início são obrigatórias.
  const valido = !!titulo?.trim() && (ehEvento ? !!dataInicio && !!horaInicio : !!conteudo?.trim())

  function trocarImagemNova(arquivo: File | null) {
    if (urlPreviaRef.current) URL.revokeObjectURL(urlPreviaRef.current)
    urlPreviaRef.current = arquivo ? URL.createObjectURL(arquivo) : null
    setImagemNova(arquivo && urlPreviaRef.current ? { arquivo, url: urlPreviaRef.current } : null)
  }

  function selecionarImagem(lista: FileList | null) {
    const arquivo = lista?.[0]
    if (!arquivo) return
    if (!TIPOS_IMAGEM.includes(arquivo.type)) {
      toast.error('A capa precisa ser PNG, JPG ou WEBP.')
      return
    }
    if (arquivo.size > LIMITE_IMAGEM_MB * MB) {
      toast.error(`A capa pode ter no máximo ${LIMITE_IMAGEM_MB} MB.`)
      return
    }
    trocarImagemNova(arquivo)
  }

  function removerImagem() {
    trocarImagemNova(null)
    setRemoverImagemAtual(true)
  }

  function adicionarAnexos(lista: FileList | null) {
    if (!lista || lista.length === 0) return
    const arquivos = Array.from(lista)
    if (anexos.length + arquivos.length > MAXIMO_ANEXOS) {
      toast.error(`O aviso pode ter no máximo ${MAXIMO_ANEXOS} anexos.`)
      return
    }
    const invalido = arquivos.find((arquivo) => !EXTENSOES_ANEXO.includes(extensao(arquivo.name)))
    if (invalido) {
      toast.error(`Tipo de arquivo não permitido: ${invalido.name}`)
      return
    }
    const grande = arquivos.find((arquivo) => arquivo.size > LIMITE_UPLOAD_MB * MB)
    if (grande) {
      toast.error(`${grande.name} passa do limite de ${LIMITE_UPLOAD_MB} MB.`)
      return
    }
    const novos = arquivos.map((arquivo) => ({
      nome: arquivo.name,
      tamanho: formatarTamanhoArquivo(arquivo.size),
      arquivo,
    }))
    setAnexos((atual) => [...atual, ...novos])
  }

  function removerAnexo(indice: number) {
    const anexoId = anexos[indice]?.id
    if (anexoId) setAnexosRemovidos((atual) => [...atual, anexoId])
    setAnexos((atual) => atual.filter((_, i) => i !== indice))
  }

  function aoSubmeter(valores: ValoresFormularioAviso) {
    const anexosNovos = anexos.flatMap((anexo) => (anexo.arquivo ? [anexo.arquivo] : []))

    // Na criação, capa e anexos vão numa requisição só; na edição, os anexos novos vão juntos.
    const tamanhoEnvio =
      anexosNovos.reduce((total, arquivo) => total + arquivo.size, 0) +
      (imagemNova && !editando ? imagemNova.arquivo.size : 0)
    if (tamanhoEnvio > LIMITE_UPLOAD_MB * MB) {
      toast.error(`Os arquivos somam mais de ${LIMITE_UPLOAD_MB} MB. Envie menos de uma vez.`)
      return
    }

    const evento = valores.categoria === 'evento'
    const texto = {
      titulo: valores.titulo.trim(),
      conteudo: valores.conteudo.trim() || null,
      categoria: valores.categoria,
      fixado: valores.fixado,
      // Fora de evento as datas nem vão: o backend apaga as de um evento que mudou de categoria.
      ...(evento
        ? {
            dataInicio: combinarDataHora(valores.dataInicio, valores.horaInicio),
            dataFim: montarFim(valores),
          }
        : {}),
    }

    if (avisoEditando) {
      salvarAviso.mutate(
        {
          id: avisoEditando.id,
          dados: texto,
          arquivos: {
            imagem: imagemNova ? imagemNova.arquivo : removerImagemAtual ? null : undefined,
            anexosNovos,
            anexosRemovidos,
          },
        },
        { onSuccess: aoFechar },
      )
      return
    }

    salvarAviso.mutate(
      {
        dados: {
          ...texto,
          setorId: valores.setorId,
          imagem: imagemNova?.arquivo ?? null,
          anexos: anexosNovos,
        },
      },
      { onSuccess: aoFechar },
    )
  }

  return (
    <Modal
      aberto
      titulo={editando ? (ehEvento ? 'Editar evento' : 'Editar aviso') : ehEvento ? 'Novo evento' : 'Novo aviso'}
      aoFechar={aoFechar}
    >
      <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium tracking-wide text-slate-700 uppercase liquido:text-sm liquido:font-semibold liquido:tracking-normal liquido:normal-case">Imagem de capa</span>
          {urlImagemExibida ? (
            <div className="flex flex-wrap items-center gap-3 rounded-[10px] liquido:rounded-inner bg-white/55 p-1.5 ring-1 ring-white/80">
              <img
                src={urlImagemExibida}
                alt="Pré-visualização da capa"
                className="h-[96px] w-full flex-none rounded-md object-cover sm:w-[160px] liquido:rounded-[10px]"
              />
              <div className="ml-auto flex gap-2 pr-1.5 pb-1.5 sm:pb-0">
                <Botao variante="secundario" onClick={() => inputImagemRef.current?.click()}>
                  Trocar
                </Botao>
                <Botao variante="secundario" onClick={removerImagem}>
                  Remover
                </Botao>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputImagemRef.current?.click()}
              className="flex cursor-pointer items-center gap-2.5 rounded-[10px] liquido:rounded-inner border border-dashed border-slate-300 bg-white/55 p-4 text-left transition-colors hover:bg-white/75"
            >
              <IconeImagem tamanho={20} className="flex-none text-brand-600" />
              <div className="flex flex-col leading-snug">
                <span className="text-sm font-semibold text-slate-800">
                  Clique para selecionar uma imagem
                </span>
                <span className="text-xs text-slate-600">
                  PNG, JPG ou WEBP até {LIMITE_IMAGEM_MB} MB
                </span>
              </div>
            </button>
          )}
          <input
            ref={inputImagemRef}
            type="file"
            accept={TIPOS_IMAGEM.join(',')}
            className="hidden"
            onChange={(e) => {
              selecionarImagem(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium tracking-wide text-slate-700 uppercase liquido:text-sm liquido:font-semibold liquido:tracking-normal liquido:normal-case">Anexos</span>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setArrastando(true)
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault()
              adicionarAnexos(e.dataTransfer.files)
              setArrastando(false)
            }}
            onClick={() => inputArquivoRef.current?.click()}
            className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] liquido:rounded-inner border border-dashed p-4 transition-colors ${
              arrastando ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white/55 hover:bg-white/75'
            }`}
          >
            <IconeClipe tamanho={20} className="flex-none text-brand-600" />
            <div className="flex flex-col leading-snug">
              <span className="text-sm font-semibold text-slate-800">
                {arrastando ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
              </span>
              <span className="text-xs text-slate-600">
                PDF, DOC, XLS, PPT, ODT, TXT ou imagem · até {MAXIMO_ANEXOS} arquivos de{' '}
                {LIMITE_UPLOAD_MB} MB
              </span>
            </div>
            <input
              ref={inputArquivoRef}
              type="file"
              multiple
              accept={EXTENSOES_ANEXO.join(',')}
              className="hidden"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                adicionarAnexos(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
          {anexos.length > 0 && (
            <div className="flex flex-col gap-2">
              {anexos.map((anexo, i) => (
                <div key={anexo.id ?? `${anexo.nome}-${i}`} className="flex items-center gap-2.5 rounded-[10px] liquido:rounded-inner bg-white/55 px-3 py-1.5 ring-1 ring-white/80">
                  <IconeArquivoTexto tamanho={16} className="flex-none text-brand-600" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-800">
                    {anexo.nome}
                  </span>
                  <span className="text-xs text-slate-600 tabular-nums">{anexo.tamanho}</span>
                  <button
                    type="button"
                    onClick={() => removerAnexo(i)}
                    title="Remover"
                    className="flex size-10 flex-none items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-danger-50 hover:text-danger-600 sm:size-8 liquido:btn-icon is-danger"
                  >
                    <IconeX tamanho={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Campo rotulo="Título" erro={errors.titulo?.message}>
          <Input
            placeholder="Ex.: Nova escala de plantão administrativo"
            {...register('titulo', { required: 'Informe um título.' })}
          />
        </Campo>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo rotulo="Categoria">
            <Select {...register('categoria')}>
              {Object.entries(ROTULO_CATEGORIA).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Setor">
            <Select {...register('setorId')} disabled={setorTravado}>
              {setores.map((setor) => (
                <option key={setor.id} value={setor.id}>
                  {setor.nome}
                </option>
              ))}
            </Select>
          </Campo>
        </div>

        {ehEvento && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo rotulo="Data de início" erro={errors.dataInicio?.message}>
              <Input
                type="date"
                {...register('dataInicio', {
                  validate: (valor) => getValues('categoria') !== 'evento' || !!valor || 'Informe a data.',
                })}
              />
            </Campo>
            <Campo rotulo="Hora de início" erro={errors.horaInicio?.message}>
              <Input
                type="time"
                {...register('horaInicio', {
                  validate: (valor) => getValues('categoria') !== 'evento' || !!valor || 'Informe a hora.',
                })}
              />
            </Campo>
            <Campo rotulo="Data de término (opcional)" erro={errors.dataFim?.message}>
              <Input
                type="date"
                {...register('dataFim', {
                  validate: (_valor, valores) => {
                    if (valores.categoria !== 'evento' || !valores.dataInicio || !valores.horaInicio) return true
                    const fim = montarFim(valores)
                    const inicio = combinarDataHora(valores.dataInicio, valores.horaInicio)
                    return !fim || fim >= inicio || 'Término antes do início.'
                  },
                })}
              />
            </Campo>
            <Campo rotulo="Hora de término (opcional)">
              <Input type="time" {...register('horaFim')} />
            </Campo>
          </div>
        )}

        <Campo rotulo={ehEvento ? 'Conteúdo (opcional)' : 'Conteúdo'} erro={errors.conteudo?.message}>
          <Textarea
            className="h-[132px]"
            placeholder={ehEvento ? 'Local, público-alvo, detalhes do evento…' : 'Escreva o comunicado…'}
            {...register('conteudo', {
              validate: (valor) =>
                getValues('categoria') === 'evento' || !!valor.trim() || 'Escreva o conteúdo do aviso.',
            })}
          />
        </Campo>

        <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-slate-700 sm:min-h-0">
          <input type="checkbox" className="size-4 accent-[#800020]" {...register('fixado')} />
          Fixar no topo do mural
        </label>

        <div className="mt-2 grid gap-2.5 border-t border-slate-200/60 liquido:border-slate-900/5 pt-[18px] sm:flex sm:justify-end">
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            variante="primario"
            disabled={!valido || salvarAviso.isPending}
          >
            {editando ? 'Salvar alterações' : ehEvento ? 'Publicar evento' : 'Publicar aviso'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}

export default ModalAviso
