# Redesign visual: "Vidro clínico" · Intranet Hospital Decós

Este documento descreve um **redesign visual** da intranet que **já existe**. O objetivo é trocar a aparência (cores, superfícies, tipografia, ícones, logos, espaçamentos internos) mantendo intactos a estrutura, o conteúdo e o funcionamento. A única mudança de comportamento permitida é a de **responsividade**.

> **Decisões posteriores a este prompt** (valem sobre o texto abaixo): este visual virou o estilo "Vidro clínico", opcional; o padrão agora é o Vidro líquido ([`DESIGN_VIDRO_LIQUIDO.md`](./DESIGN_VIDRO_LIQUIDO.md)), e o usuário escolhe entre os dois em Configurações. O fundo da aplicação ganhou um gradiente suave, a rolagem tem efeito elástico no desktop e existe uma página Configurações com ajustes de desfoque, transparência, gradiente e animações. O `glass` (menu lateral, barra superior, dropdown) ficou bem mais branco que o descrito abaixo, para o texto não competir com a página que passa por trás no celular; o painel dos modais usa um vidro próprio (`glass-modal`), com o mesmo branco e sombra mais forte. O item ativo do menu lateral não tem mais a barra bordô à esquerda: é um vidro tingido de bordô com borda especular reforçada (`item-ativo`). A troca de página é animada, no conteúdo e no indicador do menu. Regras em [`specs/transversal.md`](./specs/transversal.md), GER-14 a GER-18. As tabelas (Registro de atividades, Setores, Documentos) ganharam um tom bordô: cabeçalho tingido como o item ativo do menu, com rótulos em `brand-600`, e divisores e hover das linhas em bordô translúcido (`tabela-cabecalho`, `tabela-linha`). O vermelho `danger` continua reservado a status.

Stack de referência: **Tailwind CSS v4** e ícones **Lucide**. Se o projeto usar Tailwind v3, adapte os blocos `@theme` e `@utility` para `tailwind.config` + `@layer components`. Se o projeto não usar Tailwind, traduza as utilities para CSS puro (classes `.glass`, `.surface`, `.field`, `.btn` etc.) em vez de introduzir um framework novo. Se o projeto já usa outra biblioteca de ícones, mantenha-a; Lucide é só a referência de estilo de traço.

## Escopo (leia antes de tudo)

**Pode fazer:**
- Trocar cores, fundos, bordas, sombras, raios, fontes, tamanhos de texto e espaçamento **interno** dos componentes.
- Aplicar as classes `glass`, `surface`, `field`, `btn*` e os badges deste documento aos elementos que já existem.
- Substituir logotipos e favicon pelos da marca Decós, nos lugares onde já aparece um logo.
- Trocar ícones existentes por equivalentes visuais (e substituir emojis usados como ícone), sem mudar o que eles significam.
- Adicionar classes de estado visual (hover, focus-visible, disabled) que faltem.
- Alterar comportamento e disposição **somente para responsividade** (ver seção "Responsividade").
- Adicionar wrappers puramente visuais (ex.: a camada de manchas do fundo), desde que não mudem a ordem nem a hierarquia do conteúdo.

**Não pode fazer:**
- Adicionar, remover ou renomear telas, rotas, campos, botões, colunas, filtros, abas, menus, links ou textos.
- Mudar a ordem, a posição relativa ou o agrupamento dos componentes em telas de desktop (≥ 1024px).
- Alterar regras de validação, chamadas de API, nomes de `id`, `name`, `for`, `data-*` ou qualquer seletor usado por JavaScript ou por testes.
- Criar componentes novos (toasts, modais, interruptores, telas de login) que a aplicação não tem.
- Implementar comportamentos novos (prender foco em modal, mostrar senha, atalhos, animações de entrada). Se achar que um deles faz falta, **liste como sugestão** no resumo final, sem implementar.
- Reescrever lógica para "aproveitar" o redesign.

**Em caso de dúvida:** se a mudança altera o que o usuário pode fazer ou onde as coisas ficam no desktop, não faça.

## Processo de trabalho

1. **Inventário.** Antes de editar, liste as telas e os componentes recorrentes da aplicação (header, menu, cards, tabelas, formulários, botões, badges, alertas, modais) e onde ficam os estilos globais.
2. **Base primeiro.** Adicione os tokens, as utilities e o fundo em um único arquivo de estilos global. Troque fonte, logos e favicon.
3. **Componentes recorrentes.** Aplique o novo visual aos componentes compartilhados (layouts, partials, templates) antes das telas individuais, para o efeito se propagar.
4. **Tela por tela.** Ajuste o que sobrar em cada tela, uma de cada vez, sem tocar em lógica.
5. **Responsividade.** Só depois do visual pronto, corrija o comportamento em telas pequenas.
6. **Verificação.** Para cada tela, confira que nenhum campo, botão, coluna, texto ou link sumiu ou mudou de lugar no desktop, e que os testes existentes continuam passando.
7. **Resumo final.** Liste o que mudou por tela e, separadamente, as sugestões funcionais que você não implementou.

## Contexto

O sistema é a **intranet do Hospital Decós**. Quem usa são médicos, enfermagem, farmácia e administrativo, muitas vezes em turnos longos, em computadores antigos e monitores de baixa qualidade, consultando dados críticos com pressa. O visual deve transmitir **calma, limpeza e confiabilidade**. Legibilidade e rapidez de leitura vêm sempre antes da estética.

O estilo é o "vidro líquido" numa versão **clínica**. O vidro está presente em toda a interface: header, menu lateral, cards, tabelas, formulários e modais (os que já existirem) ficam translúcidos e ganham borda com brilho de luz. A paleta segue a identidade do hospital: **bordô (Bordeaux)** como única cor de marca, sobre uma escala de cinza levemente azulada (Slate) e branco translúcido.

## Marca e logotipos

Arquivos em `assets/` (PNG com fundo transparente):

| Arquivo | Uso |
|---|---|
| `assets/logo-decos.png` | Logotipo horizontal (símbolo + "Decós HOSPITAL"). Substitui o logo atual do header (`h-9 w-auto`) e da tela de login, se existir (`h-12`). |
| `assets/simbolo-decos.png` | Símbolo (cruz). Favicon, logo do header em telas < 640px (`size-9`) e marca d'água opcional na tela de login, se existir. |

Regras:
- Coloque os logos **onde já existe um logo ou nome do hospital no lugar de logo**. Não adicione logo em lugares novos.
- Nunca distorça, recorte, recolora ou aplique sombra no logotipo. Sempre `w-auto` para manter a proporção.
- O logotipo colorido só vai sobre fundo branco ou vidro claro. Sobre o gradiente bordô, use o logo dentro de um card branco.
- O símbolo em branco (`brightness-0 invert`) só é permitido como marca d'água decorativa, com `opacity` entre 0.05 e 0.1 e `alt=""`.
- Mantenha área de respiro em volta do logo de pelo menos a altura do "c" de "Decós".
- Mantenha o comportamento atual do logo: se já é um link, continua sendo o mesmo link; se não é, não vire link.

## Princípios

1. **Dois níveis de vidro.** O `glass` (estrutura: header, sidebar, modal, toast) é mais translúcido e com blur maior. O `surface` (conteúdo: cards, tabelas, formulários) é mais opaco (62–80% branco), para o texto ter contraste firme.
2. **Fundo claro com manchas suaves e estáticas.** O vidro precisa de algo atrás para "aparecer". Use manchas grandes e desfocadas em tons muito claros de bordô (`brand-100`, `brand-50`) e cinza (`slate-200`) sobre um gradiente `gray-50`/`gray-100`. Elas nunca se movem.
3. **Bordô é a única cor de marca.** Use em ações primárias, links, item ativo da navegação, foco e destaques. O resto é escala Slate e branco translúcido.
4. **Bordô não é vermelho de erro.** Como as duas cores são próximas, o vermelho semântico (`danger`) é mais vivo (`#dc2626`) e **sempre** vem com ícone e texto ("Crítico", "Erro", "Urgente"). Nunca use bordô para indicar status, e nunca use vermelho para decorar.
5. **Outras cores de status são raras.** Âmbar = atenção, verde = normal/concluído, azul = informativo. Todas com ícone e texto, nunca só cor.
6. **Contraste mínimo WCAG AA.** Texto normal ≥ 4.5:1, texto grande e ícones ≥ 3:1, sempre medido contra a cor final que aparece por trás do vidro. Atenção: `#ef4444` (danger-500) não passa para texto pequeno em fundo branco; use-o só em ícones e bordas, e `#dc2626` (danger-600) para texto.
7. **Desligável.** Todo o efeito precisa cair para superfícies sólidas com uma classe `no-glass` no `<html>` (só CSS, sem interruptor na interface), com `prefers-reduced-transparency` e em navegadores sem `backdrop-filter`.

## Paleta oficial

### Identidade (Bordeaux)

| Variável | Hex | Token Tailwind | Uso |
|---|---|---|---|
| `--bordeaux` | `#800020` | `brand-600` | Cor de marca principal, botões primários (CTAs), cabeçalhos, links |
| `--bordeaux-dark` | `#3b000e` | `brand-700` | Hover/active dos CTAs, texto de alto contraste, texto do item ativo |
| `--bordeaux-light` | `#b33951` | `brand-500` | Destaques secundários, borda de foco, barras de progresso, tags |
| `--bordeaux-gradient` | `#b33951 → #800020 → #3b000e` (135°) | `bg-bordeaux-gradient` | Fundo da tela de login e de áreas de destaque que já existam |
| (derivado) | `#fbf3f5` | `brand-50` | Fundo do item ativo da navegação, opção selecionada |
| (derivado) | `#f4e1e6` | `brand-100` | Avatar, manchas do fundo |

### Neutros (Slate)

| Variável | Hex | Token Tailwind | Uso |
|---|---|---|---|
| `--white` | `#ffffff` | `white` | Base do vidro, cards, modais, dropdowns |
| `--gray-50` | `#f8fafc` | `slate-50` | Fundo geral da aplicação |
| `--gray-100` | `#f1f5f9` | `slate-100` | Fundo geral (gradiente) |
| `--gray-200` | `#e2e8f0` | `slate-200` | Divisores, bordas sutis, manchas do fundo |
| `--gray-300` | `#cbd5e1` | `slate-300` | Bordas de formulário, botões desabilitados |
| `--gray-400` | `#94a3b8` | `slate-400` | Placeholders e ícones inativos (não para texto que precisa ser lido) |
| `--gray-500` | `#64748b` | `slate-500` | Textos de apoio, legendas |
| `--gray-600` | `#475569` | `slate-600` | Texto secundário, itens de menu |
| `--gray-700` | `#334155` | `slate-700` | Tipografia principal, labels |
| `--gray-800` | `#1e293b` | `slate-800` | Corpo de texto forte; títulos usam `slate-900` |

### Semânticas

| Variável | Hex | Token Tailwind | Uso |
|---|---|---|---|
| `--red-50` | `#fff5f5` | `danger-50` | Fundo de alertas, badges críticos, validação |
| `--red-500` | `#ef4444` | `danger-500` | Ícones de falha, bordas de erro |
| `--red-600` | `#dc2626` | `danger-600` / `critical` | Texto de erro, botão de exclusão (e o hover dele) |
| (complementar) | `#b7791f` | `warning` | Atenção |
| (complementar) | `#2f855a` | `success` | Normal / concluído |
| (complementar) | `#2b6cb0` | `info` | Informativo |

## Tokens (Tailwind v4)

```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  /* Bordeaux (marca Decós) */
  --color-brand-50:  #fbf3f5;
  --color-brand-100: #f4e1e6;
  --color-brand-500: #b33951; /* --bordeaux-light */
  --color-brand-600: #800020; /* --bordeaux */
  --color-brand-700: #3b000e; /* --bordeaux-dark */

  /* Erro / crítico */
  --color-danger-50:  #fff5f5;
  --color-danger-500: #ef4444;
  --color-danger-600: #dc2626;
  --color-critical:   #dc2626;

  /* Complementares de status */
  --color-warning: #b7791f;
  --color-success: #2f855a;
  --color-info:    #2b6cb0;

  --radius-card: 1rem;
  --radius-control: 0.625rem;
}

@utility bg-bordeaux-gradient {
  background: linear-gradient(135deg, #b33951 0%, #800020 45%, #3b000e 100%);
}
```

Os neutros são exatamente a escala `slate` padrão do Tailwind, então não precisam ser redefinidos.

## Fundo

```html
<body class="min-h-dvh bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 text-slate-800 antialiased text-[15px]">
  <div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
    <div class="absolute -top-40 -left-32 size-[34rem] rounded-full bg-brand-100 blur-3xl opacity-70"></div>
    <div class="absolute top-1/4 -right-40 size-[38rem] rounded-full bg-slate-200/80 blur-3xl"></div>
    <div class="absolute -bottom-48 left-1/4 size-[32rem] rounded-full bg-slate-200 blur-3xl opacity-80"></div>
    <div class="absolute top-1/2 left-1/2 size-[20rem] rounded-full bg-brand-50 blur-3xl"></div>
  </div>
```

As manchas usam `filter: blur` uma vez só, no carregamento. Por serem estáticas, não custam nada depois disso. Nunca as anime.

## Utilities

```css
/* Vidro estrutural: header, sidebar, modal, toast, barras flutuantes */
@utility glass {
  background: linear-gradient(135deg, rgb(255 255 255 / 0.66), rgb(255 255 255 / 0.46));
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid rgb(255 255 255 / 0.75);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.95),
    inset 0 -1px 0 rgb(255 255 255 / 0.35),
    0 1px 2px rgb(15 23 42 / 0.04),
    0 10px 30px rgb(15 23 42 / 0.08);
}

/* Vidro de conteúdo: cards, tabelas, formulários (mais opaco) */
@utility surface {
  position: relative;
  background: linear-gradient(160deg, rgb(255 255 255 / 0.80), rgb(255 255 255 / 0.62));
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  border: 1px solid rgb(255 255 255 / 0.8);
  border-radius: var(--radius-card);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255),
    0 1px 2px rgb(15 23 42 / 0.04),
    0 6px 20px rgb(15 23 42 / 0.05);
}

/* Cartão sobre o gradiente bordô (login, hero) */
.login-card {
  position: relative;
  background: rgb(255 255 255 / 0.9);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid rgb(255 255 255 / 0.5);
  box-shadow: inset 0 1px 0 white, 0 24px 64px rgb(59 0 14 / 0.35);
}

/* Borda especular: o "brilho de luz" do liquid glass.
   O elemento precisa ter position (relative, sticky, fixed…). */
.glass::before, .surface::before, .login-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(160deg, rgb(255 255 255 / 0.95), rgb(255 255 255 / 0) 35%, rgb(255 255 255 / 0) 65%, rgb(255 255 255 / 0.5));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  pointer-events: none;
}

@utility field {
  width: 100%;
  border-radius: var(--radius-control);
  background: rgb(255 255 255 / 0.8);
  border: 1px solid rgb(203 213 225);
  padding: 0.5rem 0.75rem;
  color: rgb(30 41 59);
  transition: border-color .15s, box-shadow .15s;
  &::placeholder { color: rgb(148 163 184); }
  &:focus { outline: none; border-color: var(--color-brand-500); box-shadow: 0 0 0 3px rgb(128 0 32 / 0.15); }
  &:user-invalid { border-color: var(--color-danger-500); }
  &:disabled { background: rgb(241 245 249 / 0.8); color: rgb(100 116 139); }
}

@utility btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  min-height: 2.5rem; padding: 0 1rem;
  border-radius: var(--radius-control);
  font-weight: 500; font-size: 0.9375rem;
  transition: background-color .15s, border-color .15s;
  &:focus-visible { outline: 2px solid var(--color-brand-500); outline-offset: 2px; }
}
@utility btn-primary   { background: var(--color-brand-600); color: white; &:hover { background: var(--color-brand-700); } }
@utility btn-secondary { background: rgb(255 255 255 / 0.7); color: rgb(51 65 85); border: 1px solid rgb(203 213 225 / 0.9); box-shadow: inset 0 1px 0 white; &:hover { background: rgb(255 255 255 / 0.95); } }
@utility btn-danger    { background: rgb(255 255 255 / 0.7); color: var(--color-danger-600); border: 1px solid rgb(220 38 38 / 0.35); &:hover { background: var(--color-danger-50); } }

/* Acessibilidade, fallback e modo sem vidro */
@media (prefers-reduced-transparency: reduce) {
  .glass, .surface { background: rgb(255 255 255 / 0.97); backdrop-filter: none; -webkit-backdrop-filter: none; }
  .glass::before, .surface::before { display: none; }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass, .surface { background: rgb(255 255 255 / 0.95); }
}
html.no-glass .glass, html.no-glass .surface {
  background: rgb(255 255 255 / 0.97); backdrop-filter: none; -webkit-backdrop-filter: none; border-color: rgb(226 232 240);
}
html.no-glass .glass::before, html.no-glass .surface::before { display: none; }
```

Inputs nativos (checkbox, radio) usam `accent-[#800020]`; o radio de prioridade "Emergência" usa `accent-[#dc2626]`.

## Regras de translucidez interna

Dentro de um `glass` ou `surface`, nunca use cinza sólido (`bg-slate-50`, `bg-slate-100`). Use branco ou escuro translúcido, para o vidro continuar visível por baixo:

| Uso | Classe |
|---|---|
| Cabeçalho de tabela | `bg-white/40` |
| Hover de linha / item de menu | `hover:bg-white/60` |
| Bloco destacado (ramal, resumo) | `bg-white/55 ring-1 ring-white/80` |
| Trilho de segmented control / barra de progresso | `bg-slate-900/5` |
| Divisores | `divide-slate-200/60`, `border-slate-200/60` |
| Separador sobre `glass` | `border-white/70` |
| Opção selecionável (radio em card) | `bg-white/60` + borda; selecionada com fundo tonal (`bg-brand-50` para neutro, `bg-danger-50` para emergência, `bg-amber-50` para urgência) |

## Aplicando nos elementos que já existem

Aplique o tratamento abaixo **ao elemento equivalente que a aplicação já tem**. Se a aplicação não tem um desses elementos, ignore o item: não o crie.

- **Header:** vira `glass`. Pode ganhar cantos `rounded-2xl` e uma margem de 12px das bordas (`mx-3 mt-3`, `sticky top-3` se já era fixo), mas o conteúdo continua na mesma ordem. Avatar do usuário, se existir, em `bg-brand-100 text-brand-700`; contador de notificações, se existir, em `bg-critical`.
- **Menu lateral:** vira `glass`, com cantos `rounded-2xl` e margem de 12px se ficar descolado das bordas. Mesmos itens, mesma ordem, mesmos rótulos. Item ativo em `bg-brand-50 text-brand-700` com barra bordô de 3px à esquerda (`box-shadow: inset 3px 0 0 #800020`); hover em `bg-white/60`.
- **Área de conteúdo:** fundo transparente para mostrar o fundo da página. Mantenha largura máxima e grid atuais no desktop.
- **Blocos de conteúdo** (painéis, cards, caixas): viram `surface`. Não junte nem separe blocos.
- **Densidade:** mantenha o espaçamento entre blocos próximo do atual. Ajuste só o padding interno para algo entre `p-4` e `p-6`.

## Tela de login (se existir)

Mesmos campos, links, botões e textos que a tela atual já tem. Muda só o visual:

- Fundo de tela cheia com `bg-bordeaux-gradient`, duas manchas desfocadas (`bg-white/10` no canto superior esquerdo, `bg-black/20` no inferior direito) e, opcionalmente, o símbolo em branco como marca d'água decorativa à direita (`opacity-[0.07]`, `alt=""`, `aria-hidden`).
- O formulário existente fica num card `login-card rounded-2xl p-8`, com o logotipo colorido (`h-12`) no lugar do logo atual.
- Campos com `field`, botão principal com `btn btn-primary` de largura total, links em `text-brand-600`, mensagens de erro existentes em `text-critical`.
- O gradiente bordô é exclusivo do login e de áreas de destaque que já existam (hero, banners). Nunca use dentro das telas de trabalho.

## Componentes

Mapeie cada componente existente para o tratamento abaixo. A tabela descreve aparência, não pede para criar nada.

| Componente existente | Superfície | Observações |
|---|---|---|
| Header, menu lateral, barras de ação fixas | `glass` | `rounded-2xl` quando descolados das bordas |
| Modal / diálogo | Painel `glass relative rounded-2xl` + overlay `bg-slate-900/20 backdrop-blur-[3px]` | Blur do overlay ≤ 4px. Não mude a forma de abrir ou fechar |
| Toast / notificação | `glass rounded-xl` | Ícone de status + texto que já existem |
| Card de indicador / número | `surface p-5` | Número `text-3xl font-semibold text-slate-900 tabular-nums`, rótulo `text-sm text-slate-500`, barras de progresso `bg-brand-500` sobre `bg-slate-900/5` |
| Tabela | `surface overflow-hidden` | Cabeçalho `bg-white/40 text-xs uppercase tracking-wide text-slate-500`, linhas `divide-y divide-slate-200/60`, hover `bg-white/60`, números à direita com `tabular-nums`. Mesmas colunas e ordem |
| Formulário | `surface p-6` | Labels `text-sm font-medium text-slate-700`, ajuda `text-xs text-slate-500`, erros existentes em `text-critical`, asterisco de obrigatório em `text-critical`. Mesmos campos e ordem |
| Inputs, selects, textareas | `field` | Checkbox e radio com `accent-[#800020]` |
| Botões | Ação principal `btn btn-primary`; demais `btn btn-secondary`; exclusão `btn btn-danger` | Mesmo texto e mesma posição |
| Badge crítico / erro | `bg-danger-50 text-danger-600 ring-1 ring-red-200` | Se hoje é só uma bolinha colorida, acrescente um ícone e mantenha o texto que existir |
| Badges de outros status | Âmbar `bg-amber-50 text-amber-800 ring-amber-200`; verde `bg-green-50 text-green-700 ring-green-200`; azul `bg-blue-50 text-blue-700 ring-blue-200`; neutro `bg-slate-100 text-slate-700 ring-slate-200` | |
| Alerta / aviso em página | `surface border-l-4 !border-l-warning` (ou `!border-l-critical`) | Mesmo texto |
| Links | `text-brand-600 hover:underline` | |
| Abas / segmented control | Trilho `bg-slate-900/5`, aba ativa `bg-white shadow-sm` | Nunca `glass` dentro de `glass` |

## Responsividade (única mudança de comportamento permitida)

A aplicação atual não se comporta bem em telas pequenas. Aqui você **pode** mudar disposição e comportamento, desde que **nada seja removido** e o desktop (≥ 1024px) continue igual ao atual.

Breakpoints: `sm` 640px, `md` 768px, `lg` 1024px.

- **Menu lateral:** abaixo de `lg`, vira drawer `fixed` que entra pela esquerda com `translate-x`, aberto por um botão de menu (ícone `menu`) no header, com scrim `bg-slate-900/30` que fecha ao clicar. Esse botão é a **única** adição de controle permitida, e só aparece abaixo de `lg`. Fecha também ao escolher um item.
- **Header:** abaixo de `sm`, troque o logotipo horizontal pelo símbolo. Itens secundários do header (setor, nome do usuário) podem ser ocultados visualmente abaixo de `md` **somente se** continuarem acessíveis em outro lugar já existente (ex.: menu do usuário); caso contrário, deixe-os quebrar linha.
- **Grids de cards:** 4 colunas no desktop → 2 em `sm`/`md` → 1 abaixo de `sm`. Mantenha a ordem de leitura.
- **Tabelas:** dentro de `overflow-x-auto` com rolagem horizontal. Pode ocultar colunas secundárias abaixo de `md` **apenas se** a informação aparecer em outro ponto da linha (ex.: abaixo do nome); nunca perca dados.
- **Formulários:** campos lado a lado viram uma coluna abaixo de `sm`. Botões de ação ocupam a largura total no celular, na mesma ordem.
- **Modais:** largura `w-full max-w-lg` com `p-4` de margem da tela; conteúdo longo rola dentro do modal (`max-h-[calc(100dvh-2rem)] overflow-auto`).
- **Alvos de toque:** mínimo 40×40px em telas pequenas.
- **Sem rolagem horizontal da página** em nenhuma largura a partir de 360px.

## Tipografia e ícones

- Fonte Inter (ou a fonte do sistema), base 15px, `leading-relaxed` em textos longos.
- Hierarquia: título da página `text-2xl font-semibold text-slate-900`; título de card `text-base font-semibold`; corpo `text-slate-700`; secundário `text-slate-500`. Evite `text-slate-400` em texto que precisa ser lido.
- Títulos ficam em `slate-900`, não em bordô. O bordô em texto é reservado para links e para o item ativo da navegação (`brand-700`).
- Números clínicos (sinais vitais, doses, horários, leitos) com `tabular-nums`.
- Ícones com 18px e traço 1.75. Emojis usados como ícone devem ser trocados pelo ícone equivalente; ícones novos não devem ser adicionados onde não havia nenhum, exceto o ícone dos badges de status.

## Movimento

- Só transições curtas (150–200ms) de cor, opacidade e `transform` em hover e foco.
- Nada de animação de fundo, parallax, efeito de "líquido" ou animações de entrada novas.
- Respeite `prefers-reduced-motion`.
- Nunca anime `backdrop-filter` nem o valor do blur.

## Acessibilidade

Obrigatório (são ajustes visuais):

- Foco visível em todos os elementos interativos (`outline: 2px solid #b33951; outline-offset: 2px`).
- Contraste WCAG AA conforme os princípios.
- Texto sobre vidro sempre escuro (`slate-700` a `slate-900`). Nunca texto branco sobre vidro claro.
- Logotipos com `alt="Hospital Decós"`; marcas d'água com `alt=""`.

Não implemente, apenas sugira no resumo final (são mudanças de comportamento): prender o foco em modais, fechar com Esc, novos `role`/`aria-live`, labels que faltam. A exceção é o drawer responsivo, que deve funcionar por teclado e ter `aria-label` no botão.

## Performance

- Elementos com `backdrop-filter` visíveis ao mesmo tempo: até ~10. Se uma tela tiver muitos blocos, aplique `surface` no contêiner maior em vez de em cada bloco pequeno.
- Nunca aplique `glass` ou `surface` em linhas de tabela, itens de lista ou qualquer coisa que se repita muitas vezes.
- Nunca use vidro dentro de vidro. Para blocos internos, use a tabela de translucidez interna.
- Não use `will-change` de forma preventiva.
- A classe `no-glass` no `<html>` deve funcionar via CSS. **Não** adicione um interruptor na interface para ela.
- Sirva os logos como arquivos estáticos com cache longo.

## Não faça

- Adicionar, remover ou reordenar qualquer coisa no desktop (ver "Escopo").
- Usar bordô para indicar erro, alerta ou status crítico (use `danger`).
- Usar o gradiente bordô em telas de trabalho, cards de dados ou tabelas.
- Manchas de fundo saturadas ou animadas, ou qualquer cor de marca além do bordô.
- Vidro escuro, texto branco sobre vidro ou modo "neon".
- Cinza sólido dentro de vidro (quebra o efeito).
- Saturação acima de 140% ou blur acima de 16px (20px só no card de login).
- Cantos acima de 16px em cards (`rounded-2xl` só em header, menu lateral, modal e login).
- Botões em pílula grandes no estilo app de consumo.
- Alterar cores, proporções ou elementos do logotipo.
- Implementar dark mode se a aplicação não tiver.

## Dark mode (só se a aplicação já tiver um)

Mesma estrutura com a escala invertida: fundo `slate-950` → `slate-900` com manchas `rgb(128 0 32 / 0.25)` e `slate-800`; `glass` = gradiente `rgb(30 41 59 / 0.6)` → `rgb(15 23 42 / 0.45)` com borda `rgb(255 255 255 / 0.1)` e brilho especular com 25% de opacidade; `surface` = `rgb(30 41 59 / 0.75)`; texto `slate-100`/`slate-400`. O bordô `#800020` não tem contraste sobre fundo escuro: use `#d4687e` para links e item ativo, mantenha `#800020` só no fundo dos botões primários (com texto branco). O logotipo precisa de uma versão para fundo escuro fornecida pela marca; até lá, coloque-o sobre uma placa branca.

## Referência visual

O arquivo `intranet.html` mostra **como o visual fica** aplicado (cores, vidro, tabelas, formulários, badges, login). Use-o só como referência de aparência. As telas, os componentes e as funcionalidades dele (interruptor de vidro, modal de detalhes, filtros, mostrar senha, toasts) **não** devem ser copiados para a aplicação.
