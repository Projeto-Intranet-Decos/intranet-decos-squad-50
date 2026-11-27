import { Container, getContainer } from '@cloudflare/containers'

// Configuração não secreta: vem de `vars` no wrangler.jsonc.
const CONFIGURACOES_DO_BACKEND = [
  'POSTGRES_PORT',
  'POSTGRES_DB',
  'ACCESS_TOKEN_MINUTES',
  'REFRESH_TOKEN_DAYS',
  'AWS_ENDPOINT_URL',
  'AWS_S3_BUCKET_NAME',
  'AWS_DEFAULT_REGION',
  'MAX_UPLOAD_SIZE_MB',
  'EMAIL_PROVIDER',
  'EMAIL_FROM',
  'FRONTEND_URL',
  'INVITE_HOURS',
  'PASSWORD_RESET_MINUTES',
] as const

// Segredos: cada um entra com `npx wrangler secret put <NOME>`.
const SEGREDOS_DO_BACKEND = [
  'POSTGRES_HOST',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'JWT_SECRET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'RESEND_API_KEY',
] as const

type VariavelDoBackend =
  | (typeof CONFIGURACOES_DO_BACKEND)[number]
  | (typeof SEGREDOS_DO_BACKEND)[number]

interface Ambiente extends Partial<Record<VariavelDoBackend, string>> {
  ASSETS: Fetcher
  BACKEND: DurableObjectNamespace<Backend>
}

const PREFIXO_DA_API = '/api'

export class Backend extends Container<Ambiente> {
  // Porta do uvicorn no backend/Dockerfile (PORT não é definido, então vale o padrão 8000).
  defaultPort = 8000
  // Sem tráfego por este tempo, o container dorme. A primeira requisição depois disso espera o
  // Python subir e o `alembic upgrade head` do CMD rodar.
  sleepAfter = '15m'

  constructor(ctx: ConstructorParameters<typeof Container>[0], env: Ambiente) {
    super(ctx, env)
    // Variável ausente fica de fora, e o backend usa o padrão dele (ou recusa subir, se for
    // obrigatória, como JWT_SECRET e POSTGRES_PASSWORD).
    const variaveis: Record<string, string> = {}
    for (const nome of [...CONFIGURACOES_DO_BACKEND, ...SEGREDOS_DO_BACKEND]) {
      const valor = env[nome]
      if (valor !== undefined) variaveis[nome] = valor
    }
    this.envVars = variaveis
  }
}

function encaminharParaBackend(requisicao: Request, env: Ambiente): Promise<Response> {
  const original = new URL(requisicao.url)
  // O backend expõe as rotas sem o prefixo, como fazia o nginx do frontend.
  const destino = new URL(original)
  destino.pathname = original.pathname.slice(PREFIXO_DA_API.length) || '/'

  const cabecalhos = new Headers(requisicao.headers)
  // O uvicorn roda com --proxy-headers e confia em qualquer origem, então o X-Forwarded-For é
  // reescrito aqui com o IP que o Cloudflare viu, em vez de aceitar o que o cliente mandou.
  const ipDoCliente = requisicao.headers.get('CF-Connecting-IP')
  cabecalhos.delete('X-Forwarded-For')
  if (ipDoCliente) {
    cabecalhos.set('X-Forwarded-For', ipDoCliente)
    cabecalhos.set('X-Real-IP', ipDoCliente)
  }
  cabecalhos.set('X-Forwarded-Proto', original.protocol.replace(':', ''))
  cabecalhos.set('X-Forwarded-Host', original.host)
  cabecalhos.set('X-Forwarded-Prefix', PREFIXO_DA_API)

  return getContainer(env.BACKEND).fetch(
    new Request(destino, {
      method: requisicao.method,
      headers: cabecalhos,
      body: requisicao.body,
      redirect: 'manual',
    }),
  )
}

export default {
  async fetch(requisicao, env): Promise<Response> {
    const { pathname } = new URL(requisicao.url)
    if (pathname === PREFIXO_DA_API || pathname.startsWith(`${PREFIXO_DA_API}/`)) {
      return encaminharParaBackend(requisicao, env)
    }
    return env.ASSETS.fetch(requisicao)
  },
} satisfies ExportedHandler<Ambiente>
