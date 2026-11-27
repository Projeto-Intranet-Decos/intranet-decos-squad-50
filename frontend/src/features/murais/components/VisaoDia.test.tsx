import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { chaveDeData } from '../formatadoresCalendario'
import type { Evento } from '../types'
import VisaoDia from './VisaoDia'

function montar(eventos: Evento[] = []) {
  const data = new Date(2026, 2, 12)
  render(
    <VisaoDia
      data={data}
      eventosPorDia={new Map([[chaveDeData(data), eventos]])}
      aniversariantesDoDia={() => []}
      aoAbrirEvento={() => {}}
    />,
  )
}

const rotulosDeHora = () => screen.getAllByText(/^\d{2}:00$/).map((elemento) => elemento.textContent)

describe('MUR-15 — visão de dia com as 24 horas', () => {
  it('sem eventos, mostra de 00:00 a 23:00', () => {
    montar()

    expect(rotulosDeHora()).toEqual(Array.from({ length: 24 }, (_, hora) => `${String(hora).padStart(2, '0')}:00`))
  })

  it('o evento aparece na linha da hora de início', () => {
    const evento = {
      id: 'e1',
      titulo: 'Plantão noturno',
      conteudo: null,
      dataInicio: new Date(2026, 2, 12, 22, 30).toISOString(),
      dataFim: null,
    } as unknown as Evento
    montar([evento])

    const linha = screen.getByText('22:00').parentElement!
    expect(linha.textContent).toContain('Plantão noturno')
  })
})
