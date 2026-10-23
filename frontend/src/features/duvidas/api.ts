import type { EdicaoFaq, Faq, NovaFaq, Setor } from './types'

// TODO integração: os dados e funções abaixo são só mock local. O modelo
// de dados real de dúvidas (FAQ curada por admin vs. sistema de ticket)
// ainda não foi decidido entre backend/app/modules/duvidas e CONTEXT.md —
// enquanto isso não se resolve, esta tela não assume nenhum contrato de
// API. Quando o contrato existir, trocar o corpo destas funções por
// chamadas a `api` (lib/api.ts).

const ATRASO_MS = 350

function atraso<T>(valor: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ATRASO_MS))
}

function idAleatorio(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

export const SETORES_MOCK: Setor[] = [
  { id: 'setor-rh', nome: 'RH' },
  { id: 'setor-acesso', nome: 'Acesso' },
  { id: 'setor-pops', nome: 'POPs' },
  { id: 'setor-cracha', nome: 'Crachá' },
  { id: 'setor-eventos', nome: 'Eventos' },
]

function nomeSetor(setorId: string): string {
  return SETORES_MOCK.find((s) => s.id === setorId)?.nome ?? ''
}

let faqMock: Faq[] = [
  {
    id: idAleatorio(),
    pergunta: 'Como solicito minhas férias?',
    resposta:
      'Preencha o formulário FORM-RH-002, disponível no repositório de documentos, e envie ao gestor imediato com 45 dias de antecedência. Após o aceite, o RH confirma o período por e-mail funcional.',
    setorId: 'setor-rh',
    setorNome: nomeSetor('setor-rh'),
    criadoEm: '2026-08-10T09:00:00.000Z',
    atualizadoEm: null,
  },
  {
    id: idAleatorio(),
    pergunta: 'Qual o prazo para justificar uma ausência?',
    resposta:
      'A justificativa (atestado ou declaração) deve ser entregue ao RH em até 48 horas úteis a partir do primeiro dia de ausência, presencialmente ou pelo portal do colaborador.',
    setorId: 'setor-rh',
    setorNome: nomeSetor('setor-rh'),
    criadoEm: '2026-08-11T09:00:00.000Z',
    atualizadoEm: null,
  },
  {
    id: idAleatorio(),
    pergunta: 'Esqueci minha senha da intranet. O que fazer?',
    resposta:
      'Use a opção "Esqueci minha senha" na tela de login com seu e-mail funcional. Se não receber o link em 10 minutos, abra chamado com o setor de Tecnologia.',
    setorId: 'setor-acesso',
    setorNome: nomeSetor('setor-acesso'),
    criadoEm: '2026-08-12T09:00:00.000Z',
    atualizadoEm: null,
  },
  {
    id: idAleatorio(),
    pergunta: 'Como sei se um POP está na versão vigente?',
    resposta:
      'Todo POP publicado no módulo de Documentos traz a data de vigência e o número da versão no cabeçalho. Em caso de dúvida, confirme com o setor responsável pelo protocolo antes de aplicá-lo.',
    setorId: 'setor-pops',
    setorNome: nomeSetor('setor-pops'),
    criadoEm: '2026-08-13T09:00:00.000Z',
    atualizadoEm: null,
  },
  {
    id: idAleatorio(),
    pergunta: 'Perdi meu crachá funcional. Como faço a segunda via?',
    resposta:
      'Comunique a perda imediatamente à Segurança Patrimonial e solicite a segunda via junto ao RH, mediante pagamento da taxa de reemissão prevista em norma interna.',
    setorId: 'setor-cracha',
    setorNome: nomeSetor('setor-cracha'),
    criadoEm: '2026-08-14T09:00:00.000Z',
    atualizadoEm: null,
  },
  {
    id: idAleatorio(),
    pergunta: 'Os treinamentos internos geram certificado?',
    resposta:
      'Sim. Treinamentos com carga horária registrada no calendário emitem certificado automático, disponível para download na página do próprio evento após a conclusão.',
    setorId: 'setor-eventos',
    setorNome: nomeSetor('setor-eventos'),
    criadoEm: '2026-08-15T09:00:00.000Z',
    atualizadoEm: null,
  },
]

function ordenadas(lista: Faq[]): Faq[] {
  return [...lista].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
}

export async function listarFaq(): Promise<Faq[]> {
  return atraso(ordenadas(faqMock))
}

export async function listarSetores(): Promise<Setor[]> {
  return atraso(SETORES_MOCK)
}

export async function criarFaq(dados: NovaFaq): Promise<Faq> {
  const faq: Faq = {
    id: idAleatorio(),
    pergunta: dados.pergunta,
    resposta: dados.resposta,
    setorId: dados.setorId,
    setorNome: nomeSetor(dados.setorId),
    criadoEm: new Date().toISOString(),
    atualizadoEm: null,
  }
  faqMock = [...faqMock, faq]
  return atraso(faq)
}

export async function editarFaq(id: string, edicao: EdicaoFaq): Promise<Faq> {
  let atualizada: Faq | undefined
  faqMock = faqMock.map((f) => {
    if (f.id !== id) return f
    atualizada = {
      ...f,
      ...edicao,
      setorNome: edicao.setorId ? nomeSetor(edicao.setorId) : f.setorNome,
      atualizadoEm: new Date().toISOString(),
    }
    return atualizada
  })
  if (!atualizada) throw new Error('Pergunta não encontrada.')
  return atraso(atualizada)
}

export async function excluirFaq(id: string): Promise<void> {
  faqMock = faqMock.filter((f) => f.id !== id)
  return atraso(undefined)
}
