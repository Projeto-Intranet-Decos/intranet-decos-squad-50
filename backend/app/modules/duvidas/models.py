import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.setores.models import Setor
from app.modules.usuarios.models import Usuario


class Faq(Base):
    """Pergunta e resposta cadastradas por admin. Guarda o setor de quem criou (escopo de edição)."""

    __tablename__ = "faqs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    pergunta: Mapped[str] = mapped_column(String(500))
    resposta: Mapped[str] = mapped_column(Text)
    autor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id"), index=True)
    setor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("setores.id"), index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    autor: Mapped[Usuario] = relationship()
    setor: Mapped[Setor] = relationship()

    @property
    def autor_nome(self) -> str:
        return self.autor.nome

    @property
    def setor_nome(self) -> str:
        return self.setor.nome
