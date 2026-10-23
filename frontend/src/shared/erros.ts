import { isAxiosError } from 'axios'
import type { ErroCampo } from './types'

/** Lê o erro `{ campo?, mensagem }` da API (GER-05); sem mensagem da API, usa a padrão. */
export function lerErroDaApi(
  erro: unknown, mensagemPadrao: string,
): Pick<ErroCampo, 'mensagem'> & Partial<ErroCampo> {
  const dados = isAxiosError<Partial<ErroCampo>>(erro) ? erro.response?.data : undefined
  return {
    campo: typeof dados?.campo === 'string' ? dados.campo : undefined,
    mensagem: typeof dados?.mensagem === 'string' ? dados.mensagem : mensagemPadrao,
  }
}
