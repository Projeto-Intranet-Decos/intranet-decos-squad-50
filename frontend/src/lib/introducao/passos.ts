import type { Usuario } from '../auth/tipos'
import {
  canAcessarAdministracao,
  canAdministrarSetores,
  canBaixarArquivos,
  canEscolherSetor,
  canGerenciarAtalhos,
  canGerenciarConteudo,
} from '../permissions'

export interface PassoIntroducao {
  alvo: string | null
  titulo: string
  texto: string
}

type UsuarioOuNada = Usuario | null | undefined

function escopoDoSetor(usuario: UsuarioOuNada): string {
  return canEscolherSetor(usuario) ? 'de qualquer setor' : 'do seu setor'
}

function seGerencia(usuario: UsuarioOuNada, texto: string): string {
  return canGerenciarConteudo(usuario) ? ` ${texto}` : ''
}

function boasVindas(usuario: UsuarioOuNada): PassoIntroducao {
  const primeiroNome = usuario?.nome.split(' ')[0]
  return {
    alvo: null,
    titulo: primeiroNome ? `Olá, ${primeiroNome}!` : 'Boas-vindas à intranet',
    texto: usuario
      ? 'Este é um passeio rápido pelo menu. Você pode pular quando quiser.'
      : 'Você está como visitante: dá para consultar tudo, mas não baixar arquivos. Este é um passeio rápido pelo menu.',
  }
}

function textoDocumentos(usuario: UsuarioOuNada): string {
  const consulta = canBaixarArquivos(usuario)
    ? 'Busque pelo título e baixe a versão atual.'
    : 'Dá para buscar e consultar; para baixar, é preciso entrar.'
  return `POPs, protocolos, manuais e formulários. ${consulta}`
    + seGerencia(usuario, `Pelo botão "Enviar documento", você publica documentos ${escopoDoSetor(usuario)}.`)
}

function textoSetores(usuario: UsuarioOuNada): string {
  const busca = 'Encontre o ramal de qualquer setor pela busca.'
  if (canAdministrarSetores(usuario)) {
    return `${busca} Você também cria, renomeia e exclui setores, e edita os ramais de todos eles.`
  }
  return busca + seGerencia(usuario, 'Você também edita os ramais do seu setor.')
}

export function montarPassos(usuario: UsuarioOuNada, temAtalhos: boolean): PassoIntroducao[] {
  const escopo = escopoDoSetor(usuario)
  const passos: PassoIntroducao[] = [
    boasVindas(usuario),
    {
      alvo: 'mural',
      titulo: 'Mural de avisos',
      texto: 'Avisos, comunicados e eventos do hospital, e os aniversariantes do mês.'
        + seGerencia(usuario, `Pelo botão "Novo aviso", você publica avisos e eventos ${escopo}.`),
    },
    {
      alvo: 'calendario',
      titulo: 'Calendário',
      texto: 'Os eventos do mural, cada um na sua data.'
        + seGerencia(usuario, `Abrindo um evento, você edita os eventos ${escopo}.`),
    },
    { alvo: 'documentos', titulo: 'POPs & documentos', texto: textoDocumentos(usuario) },
    {
      alvo: 'duvidas',
      titulo: 'Central de dúvidas',
      texto: 'Respostas para as dúvidas mais comuns sobre normas e rotinas do hospital.'
        + seGerencia(usuario, `Pelo botão "Nova dúvida", você cadastra perguntas ${escopo}.`),
    },
    { alvo: 'setores', titulo: 'Setores e ramais', texto: textoSetores(usuario) },
  ]

  if (canAcessarAdministracao(usuario)) {
    passos.push({
      alvo: 'administracao',
      titulo: 'Administração',
      texto: 'Cadastro de usuários e o registro de tudo o que foi criado, editado ou excluído no sistema.',
    })
  }

  if (temAtalhos) {
    passos.push({
      alvo: 'atalhos',
      titulo: 'Acesso rápido',
      texto: 'Links para outros sistemas do hospital.'
        + (canGerenciarAtalhos(usuario) ? ' Você adiciona, edita e remove esses links.' : ''),
    })
  }

  if (usuario) {
    passos.push({
      alvo: 'configuracoes',
      titulo: 'Configurações',
      texto: 'Ajuste o visual da intranet: estilo do vidro, transparência e animações.',
    })
  }

  passos.push({
    alvo: 'conta',
    titulo: usuario ? 'Sua conta' : 'Entrar',
    texto: usuario
      ? 'Aqui você altera sua senha e sai da intranet. Para rever esta introdução, use "Ver introdução".'
      : 'Entre com seu e-mail e senha para baixar arquivos e usar as funções do seu acesso. Para rever esta introdução, use "Ver introdução".',
  })

  return passos
}
