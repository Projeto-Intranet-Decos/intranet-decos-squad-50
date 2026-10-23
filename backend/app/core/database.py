from collections.abc import Callable

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import configuracoes

engine = create_engine(configuracoes.url_banco)
SessaoLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
  pass


def obter_sessao():
  sessao = SessaoLocal()
  try:
    yield sessao
  finally:
    sessao.close()


def obter_fabrica_de_sessoes() -> Callable[[], Session]:
  """Para tarefas em segundo plano: rodam depois da resposta, quando a sessão de `obter_sessao`
  já foi fechada, então abrem a própria."""
  return SessaoLocal
