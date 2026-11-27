import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ModalDocumento from './ModalDocumento'

const MB = 1024 * 1024

function arquivoDe(nome: string, tamanho: number) {
  const arquivo = new File(['x'], nome, { type: 'application/pdf' })
  Object.defineProperty(arquivo, 'size', { value: tamanho })
  return arquivo
}

function montar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ModalDocumento aoFechar={() => {}} documentoEditando={null} setores={[]} escolheSetor={false} />
    </QueryClientProvider>,
  )
}

function selecionar(arquivo: File) {
  const entrada = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(entrada, { target: { files: [arquivo] } })
}

describe('GER-06 — limite de 10 MB no envio de documento', () => {
  it('a área de envio mostra o limite', () => {
    montar()

    expect(screen.getByText(/até 10 MB/)).toBeTruthy()
  })

  it('recusa arquivo acima de 10 MB antes de enviar', () => {
    montar()

    selecionar(arquivoDe('manual.pdf', 10 * MB + 1))

    expect(screen.getByText('Arquivo maior que 10 MB.')).toBeTruthy()
  })

  it('aceita arquivo de 10 MB', () => {
    montar()

    selecionar(arquivoDe('manual.pdf', 10 * MB))

    expect(screen.queryByText('Arquivo maior que 10 MB.')).toBeNull()
    expect(screen.getByText(/manual\.pdf/)).toBeTruthy()
  })
})
