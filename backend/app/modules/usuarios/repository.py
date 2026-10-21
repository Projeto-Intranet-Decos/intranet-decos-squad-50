import uuid

from sqlalchemy.orm import Session

from app.modules.usuarios.models import Usuario


def buscar_por_id(sessao: Session, usuario_id: uuid.UUID) -> Usuario | None:
  return sessao.get(Usuario, usuario_id)


def buscar_por_email(sessao: Session, email: str) -> Usuario | None:
  return sessao.query(Usuario).filter(Usuario.email == email).first()


def listar(sessao: Session) -> list[Usuario]:
  return sessao.query(Usuario).all()


def adicionar(sessao: Session, usuario: Usuario) -> None:
  """Sem commit: quem chama grava junto o que mais fizer parte da mesma transação."""
  sessao.add(usuario)
  sessao.flush()


def criar(sessao: Session, usuario: Usuario) -> Usuario:
  sessao.add(usuario)
  sessao.commit()
  sessao.refresh(usuario)
  return usuario


def salvar(sessao: Session, usuario: Usuario) -> Usuario:
  sessao.commit()
  sessao.refresh(usuario)
  return usuario
