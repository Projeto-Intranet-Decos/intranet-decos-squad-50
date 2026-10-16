# Redesign visual "iOS Glass" · Intranet Hospital Decós

Este documento descreve um **redesign visual** da intranet que **já existe**, no estilo "liquid glass" do iOS 26: vidro com espessura, cantos concêntricos, controles em cápsula e tipografia de sistema, sobre a identidade bordô do Hospital Decós.

O objetivo é trocar só a aparência (cores, superfícies, raios, sombras, tipografia, ícones, espaçamento interno) e manter intactos a estrutura, o conteúdo e o funcionamento. A única mudança de comportamento permitida é a de **responsividade**.

> **Decisões posteriores a este documento** (valem sobre o texto abaixo): o iOS Glass não substitui o visual "Vidro clínico" de [`DESIGN_PROMPT.md`](./DESIGN_PROMPT.md). Os dois convivem e o usuário escolhe em **Configurações** (preferência "Estilo visual", GER-14); o iOS Glass é o padrão. O `<html>` recebe `data-visual="ios"` ou `data-visual="clinico"`; no CSS, os utilitários compartilhados (`glass`, `surface`, `btn-*`, `field`) têm um bloco `@variant ios`, e os componentes usam a variante `ios:` do Tailwind para o que muda só neste estilo. Os ajustes de desfoque e transparência continuam valendo, relativos aos valores deste documento. Regras em [`specs/transversal.md`](./specs/transversal.md), GER-01 e GER-14. Das sugestões da seção 18, foram implementadas: a barra de busca e filtros fixa no topo do mural (MUR-11, só no iOS Glass e a partir de 1024px), a refração com filtro SVG na placa do carrossel (opção "Refração no carrossel", só no Chromium) e o foco preso nos modais (GER-16). Os rótulos curtos foram reescritos em frase normal; o Vidro clínico mantém a caixa alta por CSS.

Stack de referência: **Tailwind CSS v4** e ícones **Lucide**. Se o projeto usar Tailwind v3, adapte `@theme` e `@utility` para `tailwind.config` + `@layer components`. Se não usar Tailwind, traduza as utilities para CSS puro (`.glass`, `.surface`, `.capsule` etc.) em vez de introduzir um framework novo. Se o projeto já usa outra biblioteca de ícones, mantenha-a.

---

## 1. Escopo (leia antes de tudo)

**Pode fazer:**
- Trocar cores, fundos, bordas, sombras, raios, fontes, tamanhos de texto e espaçamento **interno** dos componentes.
- Aplicar as utilities deste documento aos elementos que já existem.
- Remover classes de estilo que conflitem com o novo visual. Exemplos: a classe `uppercase` de um cabeçalho, uma borda decorativa ou uma linha colorida.
- Adicionar wrappers puramente visuais, como a camada de manchas do fundo ou a placa de vidro do texto do hero, sem mudar a ordem nem a hierarquia do conteúdo.
- Trocar ícones existentes por equivalentes visuais, sem mudar o que eles significam.
- Adicionar estados visuais que faltem: hover, `active`, `focus-visible` e `disabled`.
- Alterar disposição e comportamento **somente para responsividade** (seção 12).

**Não pode fazer:**
- Adicionar, remover ou renomear telas, rotas, campos, botões, filtros, colunas, menus, links ou textos. Se um texto está escrito em caixa alta no código-fonte, ele continua assim. Só remova a transformação quando ela vier de CSS (`uppercase`, `text-transform`).
- Mudar a ordem, a posição relativa ou o agrupamento dos componentes em telas de desktop (≥ 1024px).
- Tornar fixo (`sticky`/`fixed`) algo que hoje rola com a página, ou o contrário.
- Alterar validação, chamadas de API, rotas, nomes de `id`, `name`, `for`, `data-*` ou qualquer seletor usado por JavaScript ou testes.
- Criar componentes ou comportamentos novos, como toasts, modais, interruptores, atalhos ou animações de entrada.
- Reescrever lógica para "aproveitar" o redesign.

**Em caso de dúvida:** se a mudança altera o que o usuário pode fazer ou onde as coisas ficam no desktop, não faça. Liste como sugestão no resumo final.

## 2. Processo de trabalho

1. **Inventário.** Liste as telas e os componentes recorrentes (sidebar, hero, cards, barra de filtros, cards do mural, linha do tempo, badges, botões, formulários, tabelas, modais) e onde ficam os estilos globais.
2. **Base.** Num único arquivo de estilos global, adicione tokens, utilities, fonte e fundo. Troque logos e favicon se ainda não forem os da Decós.
3. **Componentes compartilhados** (layouts, partials, templates), antes das telas individuais.
4. **Tela por tela.** Ajuste o que sobrar em cada tela, sem tocar em lógica.
5. **Responsividade** (seção 12).
6. **Verificação.** Em cada tela, confira que nenhum elemento sumiu ou mudou de lugar no desktop, que os testes existentes passam, que o contraste continua AA e que a classe `no-glass` funciona.
7. **Resumo final.** Liste o que mudou por tela e, separadamente, as sugestões que você não implementou.

---

## 3. Contexto

O sistema é a **intranet do Hospital Decós**. É usado por médicos, enfermagem, farmácia e administrativo, muitas vezes em turnos longos e em computadores modestos. O visual deve parecer moderno e "nativo de Apple", sem perder a sobriedade de um ambiente clínico: **bordô é a única cor de marca** e o resto é branco translúcido e cinza-azulado.

O que separa um "card branco com sombra" de um "vidro do iOS" são quatro coisas, e todas precisam estar presentes:

1. **Conteúdo colorido atrás do vidro.** Sem manchas de cor no fundo, o vidro vira papel.
2. **Vidro translúcido de verdade**, com 38–62% de branco, blur alto e saturação.
3. **Espessura**, criada por brilhos e sombras internas que imitam a borda de uma lente.
4. **Geometria iOS:** cantos grandes e concêntricos, e controles em cápsula.

## 4. Marca e logotipos

Arquivos em `assets/` (PNG com fundo transparente):

| Arquivo | Uso |
|---|---|
| `assets/logo-decos.png` | Logotipo horizontal. Substitui o logo atual da sidebar ou do header e da tela de login, se existir. |
| `assets/simbolo-decos.png` | Símbolo (cruz). Favicon, logo em telas pequenas e marca d'água do hero. |

Regras:
- Coloque logos só onde já existe logo. Não adicione logo em lugares novos.
- Nunca distorça, recorte, recolora ou aplique sombra no logotipo. Use sempre `w-auto`.
- Logotipo colorido só sobre fundo claro ou vidro claro.
- O símbolo em branco só aparece como marca d'água decorativa, com `opacity` entre 0.05 e 0.1, `alt=""` e `aria-hidden="true"`.
- Mantenha o comportamento atual do logo: se já é um link, continua sendo o mesmo link.

## 5. Paleta oficial

### Identidade (Bordeaux)

| Variável | Hex | Token | Uso |
|---|---|---|---|
| `--bordeaux` | `#800020` | `brand-600` | Botões primários, links, item ativo, foco |
| `--bordeaux-dark` | `#3b000e` | `brand-700` | Hover e pressão dos primários, texto do item ativo |
| `--bordeaux-light` | `#b33951` | `brand-500` | Anel de foco, indicadores, manchas do fundo |
| `--bordeaux-gradient` | `#b33951 → #800020 → #3b000e` (135°) | `bg-bordeaux-gradient` | Hero e tela de login, onde já existirem |
| (derivado) | `#fbf3f5` | `brand-50` | Fundos tonais claros |
| (derivado) | `#f4e1e6` | `brand-100` | Avatares, manchas do fundo |

### Neutros

Escala `slate` padrão do Tailwind (`#f8fafc` a `#1e293b`), equivalente às variáveis `--gray-50` a `--gray-800` do manual da marca. Títulos em `slate-900`, corpo em `slate-700/800`, apoio em `slate-500`. `slate-400` fica só para placeholders e ícones inativos.

### Semânticas

| Variável | Hex | Token | Uso |
|---|---|---|---|
| `--red-50` | `#fff5f5` | `danger-50` | Fundo de alertas e badges críticos |
| `--red-500` | `#ef4444` | `danger-500` | Ícones de falha, bordas de erro (não use em texto pequeno) |
| `--red-600` | `#dc2626` | `danger-600` / `critical` | Texto de erro, ação destrutiva |
| (complementar) | `#b7791f` | `warning` | Atenção |
| (complementar) | `#2f855a` | `success` | Normal / concluído |
| (complementar) | `#2b6cb0` | `info` | Informativo |

**Bordô não é vermelho de erro.** Nunca use bordô para indicar status. O vermelho semântico sempre vem com ícone e texto.

## 6. Tokens

```css
@import "tailwindcss";

@theme {
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", Roboto, sans-serif;
  --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", Roboto, sans-serif;

  --color-brand-50:  #fbf3f5;
  --color-brand-100: #f4e1e6;
  --color-brand-500: #b33951;
  --color-brand-600: #800020;
  --color-brand-700: #3b000e;

  --color-danger-50:  #fff5f5;
  --color-danger-500: #ef4444;
  --color-danger-600: #dc2626;
  --color-critical:   #dc2626;
  --color-warning: #b7791f;
  --color-success: #2f855a;
  --color-info:    #2b6cb0;

  /* Raios concêntricos: interno = externo − padding */
  --radius-panel: 1.75rem;  /* 28px: sidebar, hero */
  --radius-card:  1.5rem;   /* 24px: cards */
  --radius-inner: 1rem;     /* 16px: blocos dentro de card com p-2 */
  --radius-tile:  0.875rem; /* 14px: tiles de data, miniaturas */
}

@utility bg-bordeaux-gradient {
  background: linear-gradient(135deg, #b33951 0%, #800020 45%, #3b000e 100%);
}
```

No Tailwind v4, esses tokens geram as classes `font-display`, `rounded-panel`, `rounded-card`, `rounded-inner` e `rounded-tile`, usadas ao longo deste documento.

Se a fonte Inter já for carregada no projeto, mantenha. Não adicione carregamento de fonte novo: a pilha acima usa SF Pro nos aparelhos Apple e cai para Inter ou a fonte do sistema nos demais.

## 7. Fundo (obrigatório)

O fundo é o que faz o vidro aparecer. Use uma camada fixa, estática e decorativa atrás de todo o conteúdo:

```html
<body class="min-h-dvh bg-slate-50 text-slate-800 antialiased">
  <div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
    <!-- atrás da sidebar -->
    <div class="absolute -top-24 -left-40 size-[36rem] rounded-full bg-brand-500 opacity-[0.16] blur-[120px]"></div>
    <!-- abaixo do hero, para "vazar" a cor nos cards -->
    <div class="absolute top-[22rem] left-1/3 size-[40rem] rounded-full bg-brand-600 opacity-[0.09] blur-[140px]"></div>
    <!-- atrás da coluna lateral direita -->
    <div class="absolute top-1/2 -right-32 size-[34rem] rounded-full bg-brand-100 opacity-80 blur-[120px]"></div>
    <!-- base neutra -->
    <div class="absolute -bottom-40 left-0 size-[38rem] rounded-full bg-slate-300 opacity-50 blur-[120px]"></div>
  </div>
```

Regras:
- As manchas são estáticas. Nunca as anime.
- As posições acima são para o layout sidebar + conteúdo + coluna lateral. Ajuste para que **todo painel de vidro tenha alguma cor atrás de si**.
- Não ultrapasse as opacidades indicadas. O fundo deve ler como "branco rosado", não como rosa.

## 8. Utilities de vidro

```css
/* Vidro estrutural: sidebar, header, barras flutuantes, modais */
@utility glass {
  position: relative;
  background: linear-gradient(160deg, rgb(255 255 255 / 0.58), rgb(255 255 255 / 0.34));
  backdrop-filter: blur(24px) saturate(170%);
  -webkit-backdrop-filter: blur(24px) saturate(170%);
  border: 1px solid rgb(255 255 255 / 0.55);
  box-shadow:
    inset 0 1px 1px rgb(255 255 255 / 0.95),
    inset 0 -12px 24px -14px rgb(255 255 255 / 0.6),
    inset 0 0 0 1px rgb(255 255 255 / 0.22),
    0 12px 40px rgb(59 0 14 / 0.07),
    0 1px 2px rgb(15 23 42 / 0.04);
}

/* Vidro de conteúdo: cards */
@utility surface {
  position: relative;
  border-radius: var(--radius-card);
  background: linear-gradient(160deg, rgb(255 255 255 / 0.62), rgb(255 255 255 / 0.40));
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgb(255 255 255 / 0.6);
  box-shadow:
    inset 0 1px 1px rgb(255 255 255 / 0.9),
    inset 0 -10px 20px -12px rgb(255 255 255 / 0.55),
    inset 0 0 0 1px rgb(255 255 255 / 0.25),
    0 8px 32px rgb(59 0 14 / 0.06),
    0 1px 2px rgb(15 23 42 / 0.03);
  transition: box-shadow .2s;
}

/* Vidro escuro: placas sobre o gradiente bordô (hero) */
@utility glass-dark {
  position: relative;
  background: rgb(0 0 0 / 0.2);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border: 1px solid rgb(255 255 255 / 0.14);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.18), 0 8px 32px rgb(0 0 0 / 0.18);
}

/* Borda especular: o brilho de luz na borda */
.glass::before, .surface::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(150deg, rgb(255 255 255 / 1), rgb(255 255 255 / 0) 30%, rgb(255 255 255 / 0) 70%, rgb(255 255 255 / 0.6));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  pointer-events: none;
}

/* Hover de card: só o brilho aumenta, nada se desloca */
@media (hover: hover) {
  .surface:hover {
    box-shadow:
      inset 0 1px 1px rgb(255 255 255 / 1),
      inset 0 -10px 20px -12px rgb(255 255 255 / 0.7),
      inset 0 0 0 1px rgb(255 255 255 / 0.4),
      0 10px 36px rgb(59 0 14 / 0.08),
      0 1px 2px rgb(15 23 42 / 0.03);
  }
}
```

Esses valores são intencionalmente mais intensos que os de um design web comum (blur 20–24px, saturação 160–170%, 34–62% de branco). Com texto `slate-700` a `slate-900` sobre fundo claro, o contraste continua AA.

## 9. Utilities de controles (cápsulas)

```css
/* Campo e filtro em cápsula: o "vidro escuro sutil" do iOS */
@utility capsule-field {
  display: inline-flex; align-items: center; gap: 0.5rem;
  min-height: 2.75rem; padding: 0 1rem;
  border-radius: 9999px;
  background: rgb(15 23 42 / 0.05);
  border: 1px solid transparent;
  color: rgb(30 41 59);
  transition: background-color .15s, box-shadow .15s;
  &::placeholder { color: rgb(100 116 139); }
  &:hover { background: rgb(15 23 42 / 0.07); }
  &:focus, &:focus-within { outline: none; background: rgb(255 255 255 / 0.75); box-shadow: 0 0 0 3px rgb(179 57 81 / 0.25); }
}

/* Botão primário em cápsula */
@utility btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  min-height: 2.75rem; padding: 0 1.25rem;
  border-radius: 9999px;
  font-weight: 600;
  color: white;
  background: linear-gradient(180deg, #8f0a2c, #800020);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.3), 0 6px 20px rgb(128 0 32 / 0.3);
  transition: transform .15s, background-color .15s, box-shadow .15s;
  &:hover { background: linear-gradient(180deg, #800020, #5c0017); }
  &:active { transform: scale(0.97); }
  &:focus-visible { outline: 2px solid #b33951; outline-offset: 3px; }
}

/* Botão secundário em cápsula de vidro */
@utility btn-glass {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  min-height: 2.75rem; padding: 0 1.125rem;
  border-radius: 9999px;
  font-weight: 500; color: rgb(30 41 59);
  background: rgb(255 255 255 / 0.55);
  border: 1px solid rgb(255 255 255 / 0.7);
  box-shadow: inset 0 1px 0 white, 0 2px 8px rgb(15 23 42 / 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: transform .15s, background-color .15s;
  &:hover { background: rgb(255 255 255 / 0.8); }
  &:active { transform: scale(0.97); }
  &:focus-visible { outline: 2px solid #b33951; outline-offset: 3px; }
}

/* Botão de ícone circular (editar, excluir, setas, sino, sair) */
@utility btn-icon {
  display: inline-grid; place-items: center;
  width: 2.25rem; height: 2.25rem;
  border-radius: 9999px;
  color: rgb(71 85 105);
  background: rgb(255 255 255 / 0.5);
  border: 1px solid rgb(255 255 255 / 0.7);
  box-shadow: inset 0 1px 0 white;
  transition: transform .15s, background-color .15s, color .15s;
  &:hover { background: rgb(255 255 255 / 0.85); color: rgb(15 23 42); }
  &:active { transform: scale(0.94); }
  &:focus-visible { outline: 2px solid #b33951; outline-offset: 2px; }
}
.btn-icon.is-danger:hover { color: var(--color-danger-600); background: var(--color-danger-50); }

/* Selo de categoria em cápsula */
@utility pill {
  display: inline-flex; align-items: center; gap: 0.25rem;
  padding: 0.125rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem; font-weight: 600;
}
```

Os campos de formulários longos (cadastros, edição) podem continuar retangulares com `rounded-inner`. A cápsula é para busca, filtros e controles compactos.

## 10. Fallback, acessibilidade e modo sem vidro

```css
@media (prefers-reduced-transparency: reduce) {
  .glass, .surface { background: rgb(255 255 255 / 0.96); backdrop-filter: none; -webkit-backdrop-filter: none; }
  .glass-dark { background: rgb(40 0 10 / 0.85); backdrop-filter: none; -webkit-backdrop-filter: none; }
  .glass::before, .surface::before { display: none; }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass, .surface { background: rgb(255 255 255 / 0.94); }
  .glass-dark { background: rgb(40 0 10 / 0.8); }
}
html.no-glass .glass, html.no-glass .surface {
  background: rgb(255 255 255 / 0.96); backdrop-filter: none; -webkit-backdrop-filter: none; border-color: rgb(226 232 240);
}
html.no-glass .glass::before, html.no-glass .surface::before { display: none; }
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
```

A classe `no-glass` funciona só via CSS. **Não** adicione um interruptor na interface.

---

## 11. Componentes

Aplique cada item **ao elemento equivalente que já existe**. Se a aplicação não tem o elemento, ignore o item.

### Sidebar

- Container: `glass` com `rounded-panel`, mantendo a posição e a largura atuais.
- Logo e rótulo "Intranet" sem alteração de conteúdo. Se o rótulo tem `uppercase` e `tracking` via CSS, troque por `text-xs font-medium text-slate-500`.
- Títulos de seção ("Páginas", "Administração", "Acesso rápido"): se a caixa alta vem de CSS, troque por `text-xs font-semibold text-slate-500 normal-case tracking-normal`. Se o texto está em caixa alta no código-fonte, mantenha e só reduza o `tracking`.
- Itens: cápsula com `rounded-full px-3.5 min-h-10`, ícone 18px, texto `text-[15px] text-slate-700`, hover `bg-white/50`, pressionado `active:scale-[0.98]`.
- **Item ativo:** cápsula de vidro com tom bordô, sem borda:
  ```css
  background: rgb(128 0 32 / 0.10);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.6), inset 0 0 0 1px rgb(128 0 32 / 0.08);
  color: #3b000e; font-weight: 600;
  ```
  Ícone do item ativo com traço 2 e cor `brand-600`. Remova o fundo rosa sólido e a borda atuais.
- Links externos ("Prontuário eletrônico", "Portal do colaborador"): mesmo estilo de item, mantendo o ícone de seta.
- Rodapé (Configurações, Recolher menu): mesmos itens, estilo de item comum.
- Linha do usuário: avatar circular `bg-brand-100 text-brand-700`. Sino e sair viram `btn-icon`.

### Hero / carrossel de comunicados

- Container: `rounded-panel overflow-hidden`, mantendo o gradiente bordô e a marca d'água atuais.
- Bloco de texto (selo, data, título, autor): dentro de uma placa `glass-dark rounded-[1.25rem] p-5` alinhada onde o texto já está. Título `font-display text-3xl font-bold tracking-tight text-white`; data e autor `text-white/75`.
- Selo de categoria: `pill bg-white/15 text-white ring-1 ring-white/25`.
- Setas ‹ ›: `btn-icon` na variante escura (`bg-white/15 border-white/25 text-white hover:bg-white/25`).
- Indicadores (pontos): dentro de uma cápsula `glass-dark rounded-full px-2.5 py-1.5`. O ponto ativo é uma barra `w-5 h-1.5 rounded-full bg-white`; os demais `size-1.5 rounded-full bg-white/50`.
- Mesmo número de slides, mesmo comportamento do carrossel.

### Cards de informação (Aniversariantes, Próximos eventos, Fixado)

- Container: `surface`.
- Cabeçalho: ícone 18px em `brand-600` + título em frase normal, `text-[15px] font-semibold text-slate-900`. Remova `uppercase` e `tracking` aplicados por CSS. O contador ("0 pessoas") fica em `text-sm text-slate-500` à direita.
- A linha entre cabeçalho e corpo vira `border-slate-900/5`, ou só espaçamento (`pt-1`).
- Estado vazio ("Nenhum aniversariante…"): `text-sm text-slate-500`, centralizado, com `py-6`.
- **Tile de data** (17 / OUT): `rounded-tile bg-white/60 ring-1 ring-white/80 shadow-[inset_0_1px_0_white] w-12 py-1.5 text-center`. Dia em `text-lg font-semibold text-slate-900 tabular-nums`; mês em `text-[11px] font-semibold text-brand-600`.
- Itens de lista dentro do card: separadores com recuo, começando depois do tile ou avatar (`ml-16 border-t border-slate-900/5`), como nas listas do iOS.

### Título de página ("Mural de avisos")

`font-display text-3xl font-bold tracking-tight text-slate-900` (o *large title* do iOS).

### Barra de busca e filtros

- Busca: `capsule-field` com ícone de lupa dentro. Mesma largura relativa.
- Filtros "Categoria" e "Setor": `capsule-field` com ícone à esquerda e chevron à direita. Se forem `<select>` nativos, aplique `appearance-none` e mantenha o elemento e o comportamento.
- "Novo aviso": `btn-primary`.
- Mesma ordem e mesmo alinhamento atuais.

### Linha do tempo do mural

- Data e hora à esquerda: data `text-sm font-semibold text-slate-800`, hora `text-xs text-slate-500 tabular-nums`.
- Linha vertical: `w-px bg-gradient-to-b from-slate-900/10 via-slate-900/10 to-transparent`.
- Marcador: `size-3 rounded-full` com anel de vidro (`ring-4 ring-white/70`). Ativo ou mais recente em `bg-brand-600`; demais em `bg-slate-300`.

### Card de aviso

- Container: `surface p-5`.
- Cabeçalho: avatar circular 36px (`bg-brand-100 text-brand-700`), autor `text-[15px] font-semibold text-slate-900`, setor `text-sm text-slate-500`.
- Selo de categoria: `pill` com cor tonal da categoria (ex.: comunicado `bg-blue-50 text-blue-700 ring-1 ring-blue-200/70`). Mantenha o mapeamento de cores de categoria que já existir; só troque o formato para cápsula.
- **Remova a linha bordô grossa** sob o cabeçalho. Use só espaçamento (`mt-4`) ou `border-t border-slate-900/5`.
- Título do aviso: `text-lg font-semibold tracking-tight text-slate-900`.
- Corpo: `text-[15px] leading-relaxed text-slate-700`. A linha entre título e corpo vira `border-slate-900/5` ou some.
- Ações (editar, excluir): `btn-icon`; o de excluir também recebe `is-danger`. Mesma posição.

### Outros componentes que existirem

| Componente | Tratamento |
|---|---|
| Tabela | `surface overflow-hidden`; cabeçalho `bg-white/35 text-xs font-semibold text-slate-500`; linhas `divide-y divide-slate-900/5`; hover `bg-white/50`; números com `tabular-nums` |
| Formulário longo | Dentro de `surface p-6`; campos com `rounded-inner bg-white/70 border border-slate-900/10`, foco com o anel bordô; labels `text-sm font-medium text-slate-700` |
| Modal | Painel `glass rounded-panel` + overlay `bg-slate-900/25 backdrop-blur-sm`. Não mude como abre ou fecha |
| Dropdown / menu | `glass rounded-[1.25rem] p-1.5`; itens `rounded-[0.875rem]` com hover `bg-white/60` |
| Toast existente | `glass rounded-full px-4 py-2.5` |
| Abas / segmented control | Trilho `bg-slate-900/5 rounded-full p-1`; aba ativa `bg-white rounded-full shadow-sm` |
| Badges de status | `pill`: crítico `bg-danger-50 text-danger-600 ring-1 ring-red-200`, atenção `bg-amber-50 text-amber-800`, normal `bg-green-50 text-green-700`, info `bg-blue-50 text-blue-700`; sempre com o texto que já existe |
| Links | `text-brand-600 hover:underline` |
| Tela de login | Fundo `bg-bordeaux-gradient` com manchas e marca d'água; formulário existente num card `glass` claro `rounded-panel p-8`; logotipo colorido; campos com `capsule-field`; botão `btn-primary` de largura total |

### Regra de vidro dentro de vidro

Nunca coloque `glass` ou `surface` dentro de outro `glass`/`surface`. Blocos internos usam só fundo translúcido sem blur: `bg-white/50` a `bg-white/70` com `ring-1 ring-white/80` e `shadow-[inset_0_1px_0_white]`. A exceção são os botões `btn-glass` e `btn-icon`, que têm blur baixo e são pequenos.

---

## 12. Responsividade (única mudança de comportamento permitida)

Pode mudar a disposição em telas pequenas, desde que **nada seja removido** e o desktop (≥ 1024px) continue igual ao atual. Breakpoints: `sm` 640px, `md` 768px, `lg` 1024px.

- **Sidebar:** abaixo de `lg`, vira drawer `fixed` que entra pela esquerda (`translate-x`), com scrim `bg-slate-900/25 backdrop-blur-sm` que fecha ao clicar. É aberta por um `btn-icon` com ícone `menu`, num topo compacto em `glass rounded-full` que mostra o símbolo da Decós. Esse topo e esse botão são as **únicas** adições permitidas, e só existem abaixo de `lg`. O drawer fecha ao escolher um item, funciona por teclado e o botão tem `aria-label` e `aria-expanded`.
- **Recolher menu:** se a aplicação já tem esse recurso, ele continua funcionando no desktop. No celular, o drawer substitui o comportamento de recolher.
- **Hero:** altura reduzida em telas pequenas (`min-h-56`). A placa de texto ocupa a largura disponível. Setas e indicadores continuam visíveis.
- **Cards de informação lado a lado:** viram uma coluna abaixo de `md`.
- **Mural com coluna lateral (Fixado):** abaixo de `lg`, a coluna lateral desce para **acima** do mural, para que o aviso fixado continue sendo visto primeiro, e ocupa a largura toda.
- **Barra de filtros:** abaixo de `md`, a busca ocupa a linha inteira; Categoria, Setor e "Novo aviso" ficam numa segunda linha que pode rolar na horizontal (`overflow-x-auto`, sem barra visível) ou quebrar linha. Nada é escondido.
- **Linha do tempo:** abaixo de `sm`, a coluna de data/hora passa para cima do card (data e hora numa linha só) e a linha vertical fica mais à esquerda.
- **Tabelas:** dentro de `overflow-x-auto`. Colunas só podem ser ocultadas se o dado aparecer em outro ponto da linha.
- **Raios:** abaixo de `sm`, reduza os raios redefinindo as variáveis: `@media (width < 40rem) { :root { --radius-panel: 1.375rem; --radius-card: 1.25rem; } }`.
- **Alvos de toque:** mínimo 44×44px abaixo de `lg` (a medida da Apple).
- **Sem rolagem horizontal da página** a partir de 360px de largura.

## 13. Tipografia e ícones

- Fonte: pilha de sistema da seção 6. Títulos grandes usam `--font-display` com `tracking-tight`.
- Escala: título de página `text-3xl font-bold`; título de card `text-[15px]`–`text-lg font-semibold`; corpo `text-[15px]`; apoio `text-sm`/`text-xs`.
- Frase normal em vez de CAIXA ALTA espaçada, sempre que a caixa alta vier de CSS.
- Números (datas, horas, contadores) com `tabular-nums`.
- Ícones com 18px e traço 1.75; no item ativo, traço 2. Emojis usados como ícone devem ser trocados pelo ícone equivalente.

## 14. Movimento

- Pressão: `active:scale-[0.97]` em botões e itens de menu, `0.94` em botões de ícone, com transição de 150ms.
- Hover de card: só aumenta o brilho da borda, sem deslocamento.
- Nenhuma animação de fundo, parallax, entrada ou efeito "líquido" que deforma.
- Nunca anime `backdrop-filter` nem o valor do blur.
- Respeite `prefers-reduced-motion`.

## 15. Acessibilidade

- Foco visível em todos os elementos interativos: `outline: 2px solid #b33951; outline-offset: 2–3px`.
- Contraste WCAG AA: texto ≥ 4.5:1, ícones e texto grande ≥ 3:1, medido contra a cor final atrás do vidro.
- Texto sobre vidro claro sempre `slate-700` a `slate-900`; texto branco só sobre o gradiente bordô ou `glass-dark`.
- Logotipos com `alt="Hospital Decós"`; decorações com `alt=""` e `aria-hidden="true"`.
- Botões de ícone mantêm ou recebem `aria-label` (é atributo, não muda comportamento).

## 16. Performance

- O vidro aqui é mais pesado que o normal. Mantenha no máximo **8–10 elementos com `backdrop-filter` visíveis** ao mesmo tempo, sem contar botões de ícone.
- Nunca aplique `glass`/`surface` em linhas de tabela ou itens que se repetem dezenas de vezes. Em listas longas de avisos, cada card pode ser `surface`, mas confira a rolagem num computador modesto. Se travar, use `surface` sem `backdrop-filter` nos cards do mural (mantendo gradiente, bordas e sombras internas), deixando o blur só em sidebar, hero e cards do topo.
- Não use `will-change` de forma preventiva.
- Sirva logos como arquivos estáticos com cache longo.

## 17. Não faça

- Adicionar, remover, reordenar ou fixar elementos no desktop (seção 1).
- Usar bordô para indicar erro ou status.
- Usar o gradiente bordô fora do hero e da tela de login.
- Manchas de fundo saturadas, animadas ou em cores fora da paleta.
- Cinza sólido dentro de vidro (use branco ou escuro translúcido).
- Bordas cinza de input web em busca e filtros (use `capsule-field`).
- Linhas coloridas grossas como separador.
- Raios internos maiores ou iguais ao do contêiner (quebra a concentricidade).
- Texto branco sobre vidro claro.
- Alterar cores, proporções ou elementos do logotipo.
- Implementar dark mode se a aplicação não tiver.

## 18. Sugestões para listar, não implementar

Coloque no resumo final, sem implementar:
- Barra de busca e filtros fixa no topo, com os avisos rolando por baixo do vidro (é a assinatura do iOS 26, mas muda o posicionamento).
- Efeito de refração real com filtro SVG (`feDisplacementMap`) no hero; só funciona em navegadores Chromium.
- Prender o foco em modais e fechar com Esc, se ainda não existir.
- Qualquer outra melhoria funcional que você perceber durante o trabalho.

## Referência visual

O `intranet.html` mostra a paleta e a marca aplicadas, mas com o vidro mais contido do documento anterior. Neste redesign, os valores deste documento prevalecem sobre os do `intranet.html`. As telas e funcionalidades dele não devem ser copiadas para a aplicação.
