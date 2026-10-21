import uuid

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.autenticacao.models import FinalidadeToken, TokenAtualizacao, TokenUsoUnico


def criar_token(sessao: Session, token: TokenAtualizacao) -> TokenAtualizacao:
  sessao.add(token)
  sessao.commit()
  return token


def buscar_por_hash(sessao: Session, token_hash: str) -> TokenAtualizacao | None:
  return (
    sessao.query(TokenAtualizacao)
    .filter(TokenAtualizacao.token_hash == token_hash)
    .first()
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
