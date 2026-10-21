import { isAxiosError } from 'axios'
import type { ErroApi } from './api'

/** Lê o erro `{ campo?, mensagem }` da API (GER-05); sem mensagem da API, usa a padrão. */
export function lerErroDaApi(erro: unknown, mensagemPadrao: string): ErroApi {
  const dados = isAxiosError<ErroApi>(erro) ? erro.response?.data : undefined
  return {
    campo: typeof dados?.campo === 'string' ? dados.campo : undefined,
    mensagem: typeof dados?.mensagem === 'string' ? dados.mensagem : mensagemPadrao,
  }
}
