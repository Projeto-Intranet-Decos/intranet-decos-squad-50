# Calendário: eventos e aniversariantes (`CAL`) — absorvido pelo mural

Em 2026-10-09 o módulo `calendario` foi unificado com o mural `[CTX]`: **evento passou a ser um
aviso** de categoria `evento`, com data de início e fim, e aparece no feed do mural e na tela de
calendário. Aniversariantes e a tela de calendário viraram funcionalidades do mural. Os requisitos
vivos estão em [`murais.md`](./murais.md).

Os IDs `CAL` são permanentes e não devem ser reaproveitados. Ficam aqui riscados, apontando para o
requisito que os substitui. Teste novo cita o ID `MUR`, não o `CAL`.

| ID | Requisito | Substituído por |
|---|---|---|
| ~~CAL-01~~ | ~~Listar eventos por período~~ | MUR-12 (`GET /murais/eventos`) |
| ~~CAL-02~~ | ~~Evento de vários dias aparece em todo período que atravessa~~ | MUR-12 (a regra do período já nasce corrigida) |
| ~~CAL-03~~ | ~~Consultar um evento~~ | MUR-02 (evento é um aviso) |
| ~~CAL-04~~ | ~~Criar evento~~ | MUR-03 (`categoria=evento`, com capa e anexos como qualquer aviso) |
| ~~CAL-05~~ | ~~Editar e excluir evento~~ | MUR-06, MUR-10 |
| ~~CAL-06~~ | ~~Aniversariantes do mês~~ | MUR-13 (`GET /murais/aniversariantes`) |
| ~~CAL-07~~ | ~~Filtrar aniversariantes por setor e data~~ | MUR-14 |
| ~~CAL-08~~ | ~~Tela do calendário~~ | MUR-15 |

## O que mudou na regra

- Evento não é mais tabela própria (`eventos`); é linha de `avisos` com `categoria = 'evento'` e
  `data_inicio`/`data_fim`.
- Evento ganha o que o aviso tem: capa, anexos, `fixado` e presença no feed/carrossel.
- `descricao` do evento virou o `conteudo` do aviso, que continua opcional para eventos.
- A edição deixa de ser completa (`PUT` substituindo tudo) e passa a ser parcial, como a do aviso
  (MUR-06).
- A categoria `convite` deixou de existir.

O plano de migração está em
[`docs/superpowers/plans/2026-10-09-mural-absorve-calendario.md`](../superpowers/plans/2026-10-09-mural-absorve-calendario.md).
