from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

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
