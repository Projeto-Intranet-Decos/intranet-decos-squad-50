import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ModalAviso from './ModalAviso'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const MB = 1024 * 1024
const ADMIN = { id: 'u1', nome: 'Ana', role: 'admin_setor' as const, setorId: 's1' }

function arquivoDe(nome: string, tamanho: number) {
  const arquivo = new File(['x'], nome, { type: 'application/pdf' })
  Object.defineProperty(arquivo, 'size', { value: tamanho })
  return arquivo
}

function montar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ModalAviso aoFechar={() => {}} avisoEditando={null} setores={[{ id: 's1', nome: 'Enfermagem' }]} usuario={ADMIN} />
    </QueryClientProvider>,
  )
}

function anexar(...arquivos: File[]) {
  const entrada = document.querySelector('input[type="file"][multiple]') as HTMLInputElement
  fireEvent.change(entrada, { target: { files: arquivos } })
}

describe('GER-06 — limite de 10 MB nos anexos do aviso', () => {
  beforeEach(() => vi.mocked(toast.error).mockClear())

  it('a área de anexos mostra o limite por arquivo', () => {
    montar()

    expect(screen.getByText(/arquivos de 10 MB/)).toBeTruthy()
  })

  it('recusa anexo acima de 10 MB antes de enviar', () => {
    montar()

    anexar(arquivoDe('escala.pdf', 10 * MB + 1))

    expect(toast.error).toHaveBeenCalledWith('escala.pdf passa do limite de 10 MB.')
    expect(screen.queryByText('escala.pdf')).toBeNull()
  })

  it('aceita anexo de 10 MB', () => {
    montar()

    anexar(arquivoDe('escala.pdf', 10 * MB))

    expect(toast.error).not.toHaveBeenCalled()
    expect(screen.getByText('escala.pdf')).toBeTruthy()
  })
})
