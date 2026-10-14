# Arquitetura Frontend — Intranet do Hospital

## Stack

- **React + TypeScript**
- **Tailwind CSS** para estilização
- **Axios** para requisições HTTP
- **TanStack Query** para data fetching, cache e mutations
- **React Hook Form** para formulários
- **Sonner** para notificações (toast)

## Organização de pastas

Estrutura por feature, 1:1 com os módulos do sistema — facilita trabalho paralelo do time sem conflito de merge:

```
src/
  features/
    murais/
      components/
      hooks/
      types.ts
      api.ts
    documentos/       # inclui upload de arquivos
    setores/
    duvidas/
    usuarios/          # rota exclusiva superadmin
    logs/               # rota exclusiva superadmin
  shared/
    components/         # Input, Button, Layout, etc.
    hooks/
    types.ts             # tipos de domínio compartilhados entre features (Setor, User)
  lib/
    api.ts               # instância axios + interceptors
    auth/
      ProtectedRoute.tsx
      useAuth.ts
      types.ts
    permissions.ts        # lógica de RBAC + escopo por setor
  App.tsx
```

**Sem Atomic Design** — não há design system compartilhado entre produtos que justifique essa camada.

## RBAC (controle de acesso)

Três níveis de usuário, com uma dimensão de escopo (setor) cruzando o nível:

- `comum` — sem permissões administrativas
- `admin_setor` — pode gerenciar/deletar apenas recursos do próprio setor
- `superadmin` — acesso total

```ts
interface User {
  id: string;
  nome: string;
  role: 'comum' | 'admin_setor' | 'superadmin';
  setorId: string | null; // relevante quando role é admin_setor
}
```

Toda checagem de permissão responde duas perguntas: **(1)** qual o nível da pessoa e **(2)** o setor do recurso bate com o setor dela (só relevante para `admin_setor`).

```ts
// lib/permissions.ts
function podeDeletar(usuario: User, recurso: { setorId: string }): boolean {
  if (usuario.role === 'superadmin') return true;
  if (usuario.role === 'admin_setor') return usuario.setorId === recurso.setorId;
  return false;
}
```

**Importante:** essa checagem no frontend é só UX (evita a pessoa ver/tentar algo que não pode). A validação real e obrigatória acontece no backend — o frontend nunca é a fonte de verdade da autorização.

### Rotas protegidas

```tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  rolesPermitidas: Array<'admin_setor' | 'superadmin'>;
}

function ProtectedRoute({ children, rolesPermitidas }: ProtectedRouteProps) {
  const { user } = useAuth();
  if (!user || !rolesPermitidas.includes(user.role)) {
    return <Navigate to="/nao-autorizado" />;
  }
  return <>{children}</>;
}
```

Usada nas rotas de `/usuarios` e `/logs`, restritas a `superadmin`.

## Autenticação e token

- Token guardado em **localStorage** (decisão consciente para o MVP).
- **Trade-off registrado como dívida técnica**: localStorage é acessível via JS, então é vulnerável a XSS. Se o módulo de documentos vier a renderizar conteúdo não sanitizado no futuro, isso deve ser revisto (migrar para cookie httpOnly) antes de ir para produção definitiva com a equipe de TI do hospital.

## HTTP (axios)

Instância centralizada com interceptors para token e tratamento de erros de autenticação:

```ts
// lib/api.ts
const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // token expirado/inválido -> redireciona para login
    }
    return Promise.reject(error);
  }
);
```

**Atenção:** o módulo de documentos usa `multipart/form-data` (upload de arquivo), diferente do `application/json` padrão do resto da API — não forçar `Content-Type` fixo globalmente.

## Data fetching (TanStack Query)

Um hook por feature, encapsulando a chamada à API:

```ts
// features/usuarios/hooks/useUsuarios.ts
export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => (await api.get<User[]>('/usuarios')).data,
  });
}
```

Mutations invalidam a query correspondente para refletir mudanças automaticamente:

```ts
const criarUsuario = useMutation({
  mutationFn: (novo: NovoUsuario) => api.post('/usuarios', novo),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
});
```

Provider configurado uma vez em `App.tsx`.

## Formulários (React Hook Form)

- **React Hook Form em todos os módulos.** Zod (ou schema validation) só entra pontualmente se algum formulário específico tiver validação complexa o suficiente para justificar — não é usado globalmente.
- Módulo de **documentos** tem tratamento especial por causa do upload de arquivo (`FormData`, validação de tipo e tamanho de arquivo).

### Tratamento de erro vindo do backend

Contrato esperado do backend para erros de validação de campo:

```json
{ "campo": "cpf", "mensagem": "CPF já cadastrado" }
```

No `onError` da mutation: exibe toast (Sonner) **e** atrela o erro ao campo específico via `setError` do React Hook Form. Erros genéricos (sem campo, ex: falha de rede ou 500) caem só no toast.

```tsx
onError: (erro) => {
  if (isAxiosError<ErroCampo>(erro) && erro.response?.data.campo) {
    const { campo, mensagem } = erro.response.data;
    setError(campo, { message: mensagem });
    toast.error(mensagem);
  } else {
    toast.error('Erro ao criar usuário. Tente novamente.');
  }
},
```

## Componentes de UI

Inputs estilizados com Tailwind, extraídos em `shared/components/` para evitar repetição das classes em cada formulário. Usam `forwardRef` para permanecerem compatíveis com `register` do React Hook Form.

## Notificações (Sonner)

Provider global em `App.tsx`:

```tsx
<Toaster richColors position="top-right" />
```

Usado para feedback de sucesso/erro em criações, edições e exclusões em todos os módulos.

## Pontos em aberto (não bloqueiam o MVP, mas precisam de decisão)

- **Tipos compartilhados** entre features (`Setor`, `User`) — definir onde moram (ex: `shared/types.ts`).
- ~~**Testes**~~ — decidido: entram no MVP, guiados pelos specs (vitest + Testing Library + MSW). Ver [`specs/README.md`](./specs/README.md).
- **Variáveis de ambiente** — onde/como configurar a URL da API entre dev e produção.
- **Framework do backend** (Python, Django descartado) — ainda não definido.
- **Módulo de dúvidas** — ainda não definido se é FAQ estático ou sistema de tickets com fluxo de status.
