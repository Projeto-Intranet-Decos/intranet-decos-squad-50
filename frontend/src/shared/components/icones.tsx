import {
  ArrowDownToLine,
  ArrowUpRight,
  Bell,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  CircleQuestionMark,
  CircleX,
  CloudUpload,
  Download,
  Eye,
  EyeOff,
  FileText,
  Funnel,
  History,
  Image,
  Info,
  LogOut,
  Megaphone,
  Menu,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Pencil,
  Phone,
  Pin,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Trash,
  TriangleAlert,
  Upload,
  User,
  Users,
  X,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'

// Todo ícone da aplicação vem do Lucide e passa por aqui: os componentes importam os nomes
// abaixo, nunca `lucide-react` direto, para o tamanho e o traço ficarem iguais em toda a interface.

interface PropriedadesIcone extends Omit<LucideProps, 'size'> {
  tamanho?: number
}

function criarIcone(Lucide: LucideIcon) {
  function Icone({ tamanho = 18, ...resto }: PropriedadesIcone) {
    return <Lucide size={tamanho} strokeWidth={1.75} aria-hidden="true" {...resto} />
  }
  return Icone
}

// Navegação
export const IconeMegafone = criarIcone(Megaphone)
export const IconeCalendario = criarIcone(Calendar)
export const IconeArquivos = criarIcone(FileText)
export const IconeDuvida = criarIcone(CircleQuestionMark)
export const IconeTelefone = criarIcone(Phone)
export const IconeUsuarios = criarIcone(Users)
export const IconeHistorico = criarIcone(History)
export const IconeAjustes = criarIcone(SlidersHorizontal)
export const IconeMenu = criarIcone(Menu)
export const IconeSidebarRecolher = criarIcone(PanelLeftClose)
export const IconeSidebarExpandir = criarIcone(PanelLeftOpen)
export const IconeSino = criarIcone(Bell)
export const IconeSair = criarIcone(LogOut)
export const IconeSetaExterna = criarIcone(ArrowUpRight)

export const IconeCaretUp = criarIcone(ChevronUp)
export const IconeCaretDown = criarIcone(ChevronDown)
export const IconeCaretLeft = criarIcone(ChevronLeft)
export const IconeCaretRight = criarIcone(ChevronRight)

// Busca e filtros
export const IconeLupa = criarIcone(Search)
export const IconeFunil = criarIcone(Funnel)
export const IconePredio = criarIcone(Building2)

// Ações
export const IconeMais = criarIcone(Plus)
export const IconeMenos = criarIcone(Minus)
export const IconeLapis = criarIcone(Pencil)
export const IconeLixeira = criarIcone(Trash)
export const IconeX = criarIcone(X)
export const IconeCheck = criarIcone(Check)
export const IconePin = criarIcone(Pin)
export const IconeOlho = criarIcone(Eye)
export const IconeOlhoFechado = criarIcone(EyeOff)

// Arquivos
export const IconeClipe = criarIcone(Paperclip)
export const IconeArquivoTexto = criarIcone(FileText)
export const IconeImagem = criarIcone(Image)
export const IconeEnviar = criarIcone(Upload)
export const IconeNuvemEnviar = criarIcone(CloudUpload)
export const IconeReenviar = criarIcone(Send)
export const IconeBaixar = criarIcone(Download)
export const IconeDownload = criarIcone(ArrowDownToLine)

// Pessoas
export const IconeUsuario = criarIcone(User)

// Status
export const IconeAlerta = criarIcone(TriangleAlert)
export const IconeSucesso = criarIcone(CircleCheck)
export const IconeErro = criarIcone(CircleX)
export const IconeInfo = criarIcone(Info)
