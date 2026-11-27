import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { chaveDeData } from '../formatadoresCalendario'
import type { Evento } from '../types'
import VisaoSemana from './VisaoSemana'

const QUINTA = new Date(2026, 2, 12)

function montar(eventos: Evento[] = []) {
  render(
    <VisaoSemana
      data={QUINTA}
      eventosPorDia={new Map([[chaveDeData(QUINTA), eventos]])}
      aniversariantesDoDia={() => []}
      aoAbrirEvento={() => {}}
    />,
  )
}

const rotulosDeHora = () => screen.getAllByText(/^\d{2}:00$/).map((elemento) => elemento.textContent)

/** A grade é plana: a linha de uma célula é o rótulo de hora mais próximo antes dela. */
function horaDaLinha(elemento: HTMLElement) {
  let atual = elemento.closest('div.min-h-\\[52px\\]')?.previousElementSibling
  while (atual && !/^\d{2}:00$/.test(atual.textContent ?? '')) atual = atual.previousElementSibling
  return atual?.textContent
}

describe('MUR-15 — visão de semana com as 24 horas', () => {
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

    const botao = screen.getByRole('button', { name: /Plantão noturno/ })
    expect(horaDaLinha(botao)).toBe('22:00')
  })
})
