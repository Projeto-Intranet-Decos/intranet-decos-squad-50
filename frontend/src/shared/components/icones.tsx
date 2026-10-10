import type { SVGProps } from 'react'

interface PropriedadesIcone extends SVGProps<SVGSVGElement> {
  tamanho?: number
}

function criarIcone(caminho: React.ReactNode) {
  function Icone({ tamanho = 18, ...resto }: PropriedadesIcone) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={tamanho}
        height={tamanho}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...resto}
      >
        {caminho}
      </svg>
    )
  }
  return Icone
}

export const IconeMegafone = criarIcone(
  <path d="M3 11v2a2 2 0 0 0 2 2h1l3.2 4.8a1 1 0 0 0 1.8-.6V6.8a1 1 0 0 0-1.8-.6L6 11H5a2 2 0 0 0-2 2Zm16-6.5c1.8 1.6 2.8 3.8 2.8 6.5s-1 4.9-2.8 6.5" />,
)

export const IconeCalendario = criarIcone(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>,
)

export const IconeArquivos = criarIcone(
  <>
    <path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v5h5M8 13h8M8 17h8" />
  </>,
)

export const IconeDuvida = criarIcone(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.7 2.2c-.9.5-1.2 1-1.2 1.8" />
    <path d="M12 17.2h.01" />
  </>,
)

export const IconeTelefone = criarIcone(
  <path d="M5 4h3l1.6 4.2-2 1.6a12.5 12.5 0 0 0 6.6 6.6l1.6-2L20 16v3a1.6 1.6 0 0 1-1.7 1.6A16 16 0 0 1 3.4 5.7 1.6 1.6 0 0 1 5 4Z" />,
)

export const IconeUsuarios = criarIcone(
  <>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M16 8.2a3 3 0 1 1 1 5.8M18.5 19a5.3 5.3 0 0 0-3.2-4.9" />
  </>,
)

export const IconeHistorico = criarIcone(
  <>
    <path d="M3 11a9 9 0 1 0 2.6-6.3" />
    <path d="M3 4v4h4M12 7v5l3.5 2" />
  </>,
)

export const IconeSidebarRecolher = criarIcone(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16M14 10l-2 2 2 2" />
  </>,
)

export const IconeSidebarExpandir = criarIcone(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16M13 10l2 2-2 2" />
  </>,
)

export const IconeSino = criarIcone(
  <>
    <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </>,
)

export const IconeSair = criarIcone(
  <>
    <path d="M9 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3" />
    <path d="M14 8l4 4-4 4M18 12H9" />
  </>,
)

export const IconeSetaExterna = criarIcone(<path d="M7 17 17 7M9 7h8v8" />)

export const IconeCaretUp = criarIcone(<path d="m6 15 6-6 6 6" />)
export const IconeCaretDown = criarIcone(<path d="m6 9 6 6 6-6" />)
export const IconeCaretLeft = criarIcone(<path d="m15 6-6 6 6 6" />)
export const IconeCaretRight = criarIcone(<path d="m9 6 6 6-6 6" />)

export const IconeLupa = criarIcone(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
)

export const IconeFunil = criarIcone(<path d="M4 5h16l-6 7.5V19l-4 2v-8.5Z" />)

export const IconePredio = criarIcone(
  <>
    <rect x="4" y="3" width="10" height="18" rx="1" />
    <path d="M14 8h6v13h-6M7 7h1M7 11h1M7 15h1" />
  </>,
)

export const IconeMais = criarIcone(<path d="M12 5v14M5 12h14" />)

export const IconeMenos = criarIcone(<path d="M5 12h14" />)

export const IconeMenu = criarIcone(<path d="M4 6h16M4 12h16M4 18h16" />)

export const IconeAjustes = criarIcone(
  <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" />,
)

export const IconeLapis = criarIcone(
  <path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 15v5Z" />,
)

export const IconeLixeira = criarIcone(
  <>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </>,
)

export const IconeX = criarIcone(<path d="m6 6 12 12M18 6 6 18" />)

export const IconePin = criarIcone(
  <path d="M12 2c-3 0-5.5 2.3-5.5 5.6 0 3.7 4 8.6 5.1 9.9a.5.5 0 0 0 .8 0c1.1-1.3 5.1-6.2 5.1-9.9C17.5 4.3 15 2 12 2Zm0 8a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4Z" />,
)

export const IconeClipe = criarIcone(
  <path d="M8 12.5 15 5.6a3 3 0 0 1 4.2 4.2l-8.5 8.5a5 5 0 0 1-7-7L12 3" />,
)

export const IconeArquivoTexto = criarIcone(
  <>
    <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v5h5M9 13h6M9 16.5h6" />
  </>,
)

export const IconeUsuario = criarIcone(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </>,
)

export const IconeEnviar = criarIcone(
  <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4M12 15V4M7.5 8.5 12 4l4.5 4.5" />,
)

export const IconeBaixar = criarIcone(
  <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4M12 4v11M7.5 10.5 12 15l4.5-4.5" />,
)

export const IconeNuvemEnviar = criarIcone(
  <>
    <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4.75 4.75 0 0 1-.5 9.5" />
    <path d="M12 19v-7M9 14.5l3-3 3 3" />
  </>,
)

export const IconeImagem = criarIcone(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m5 18 5-5 3 3 3.5-3.5L21 16" />
  </>,
)

export const IconeDownload = criarIcone(<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 19.5h14" />)

export const IconeOlho = criarIcone(
  <>
    <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
)

export const IconeAlerta = criarIcone(
  <>
    <path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4M12 17h.01" />
  </>,
)
