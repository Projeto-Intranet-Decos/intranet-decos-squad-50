import uuid

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.modules.autenticacao.models import FinalidadeToken, TokenAtualizacao, TokenUsoUnico


def criar_token(sessao: Session, token: TokenAtualizacao) -> TokenAtualizacao:
  sessao.add(token)
  sessao.commit()
  return token


def buscar_por_hash(
  sessao: Session, token_hash: str, *, travar: bool = False
) -> TokenAtualizacao | None:
  consulta = select(TokenAtualizacao).where(TokenAtualizacao.token_hash == token_hash)
  if travar:
    consulta = consulta.with_for_update()
  return sessao.scalars(consulta).first()


def revogar_tokens_do_usuario(sessao: Session, usuario_id: uuid.UUID) -> None:
  """Encerra as sessões abertas (refresh tokens). Sem commit."""
  sessao.execute(
    update(TokenAtualizacao)
    .where(TokenAtualizacao.usuario_id == usuario_id, TokenAtualizacao.revogado.is_(False))
    .values(revogado=True)
  )


def revogar_sessao(sessao: Session, sessao_id: uuid.UUID) -> None:
  """Logout (AUT-06): o token atual e todos os que ele substituiu. Sem commit."""
  sessao.execute(
    update(TokenAtualizacao)
    .where(TokenAtualizacao.sessao_id == sessao_id, TokenAtualizacao.revogado.is_(False))
    .values(revogado=True)
  )


def adicionar_link(sessao: Session, link: TokenUsoUnico) -> None:
  sessao.add(link)
  sessao.flush()


def buscar_link_por_hash(
  sessao: Session, token_hash: str, *, travar: bool = False
) -> TokenUsoUnico | None:
  consulta = select(TokenUsoUnico).where(TokenUsoUnico.token_hash == token_hash)
  if travar:
    consulta = consulta.with_for_update()
  return sessao.scalars(consulta).first()


def apagar_links_pendentes(
  sessao: Session, usuario_id: uuid.UUID, finalidade: FinalidadeToken | None = None
) -> None:
  """Apaga os links ainda não usados; os usados ficam como histórico."""
  consulta = delete(TokenUsoUnico).where(
    TokenUsoUnico.usuario_id == usuario_id, TokenUsoUnico.usado_em.is_(None)
  )
  if finalidade is not None:
    consulta = consulta.where(TokenUsoUnico.finalidade == finalidade)
  sessao.execute(consulta)
