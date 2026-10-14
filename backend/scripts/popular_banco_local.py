"""Popula o banco com o mínimo pra testar a aplicação localmente.

Só pra desenvolvimento: nunca roda em deploy (o Dockerfile e a CI rodam apenas
`alembic upgrade head`). Pressupõe o banco já migrado.

    cd backend
    alembic upgrade head
    python -m scripts.popular_banco_local

Cria 2 setores com ramal, 1 usuário por papel (mais um admin_setor no outro
setor, pra testar isolamento entre setores), 1 aviso e 1 evento. É idempotente:
o que já existir (setor por nome, usuário por e-mail, aviso/evento por título
no setor) é mantido como está.

Recusa rodar se DATABASE_URL não apontar pra localhost; use --forcar se o seu
banco local estiver em outro host.
"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

RAIZ_BACKEND = Path(__file__).resolve().parents[1]
if str(RAIZ_BACKEND) not in sys.path:
  sys.path.insert(0, str(RAIZ_BACKEND))

from sqlalchemy import make_url, select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.config import configuracoes  # noqa: E402
from app.core.database import SessaoLocal  # noqa: E402
from app.core.security import gerar_hash_senha  # noqa: E402
from app.modules.murais.models import Aviso, CategoriaAviso  # noqa: E402
from app.modules.setores.models import Ramal, Setor  # noqa: E402
from app.modules.usuarios.models import Papel, Usuario  # noqa: E402

SENHA_PADRAO = "senha123"
HOSTS_LOCAIS = {"localhost", "127.0.0.1", "::1"}

SETORES = [
  ("Enfermagem", "2001"),
  ("TI", "3001"),
]

# (nome, e-mail, papel, setor)
USUARIOS = [
  ("Super Admin", "superadmin@hospital.com.br", Papel.superadmin, None),
  ("Admin Enfermagem", "admin.enfermagem@hospital.com.br", Papel.admin_setor, "Enfermagem"),
  ("Admin TI", "admin.ti@hospital.com.br", Papel.admin_setor, "TI"),
  ("Colaborador Enfermagem", "comum.enfermagem@hospital.com.br", Papel.comum, "Enfermagem"),
]


def _garantir_banco_local() -> None:
  host = make_url(configuracoes.database_url).host
  if host not in HOSTS_LOCAIS and "--forcar" not in sys.argv:
    raise SystemExit(
      f"DATABASE_URL aponta pra '{host}', que não parece local. "
      "Se for mesmo o seu banco de desenvolvimento, rode de novo com --forcar."
    )


def _garantir_setor(sessao: Session, nome: str, ramal: str) -> Setor:
  setor = sessao.scalar(select(Setor).where(Setor.nome == nome))
  if setor:
    return setor
  setor = Setor(nome=nome, ramais=[Ramal(numero=ramal)])
  sessao.add(setor)
  sessao.flush()
  print(f"Setor criado: {nome} (ramal {ramal})")
  return setor


def _garantir_usuario(
  sessao: Session, nome: str, email: str, papel: Papel, setor: Setor | None
) -> Usuario:
  usuario = sessao.scalar(select(Usuario).where(Usuario.email == email))
  if usuario:
    return usuario
  usuario = Usuario(
    nome=nome,
    email=email,
    senha_hash=gerar_hash_senha(SENHA_PADRAO),
    role=papel,
    setor_id=setor.id if setor else None,
  )
  sessao.add(usuario)
  sessao.flush()
  print(f"Usuário criado: {email} ({papel.value})")
  return usuario


def _garantir_aviso(sessao: Session, autor: Usuario, setor: Setor) -> None:
  titulo = "Bem-vindos à intranet"
  existe = sessao.scalar(select(Aviso).where(Aviso.titulo == titulo, Aviso.setor_id == setor.id))
  if existe:
    return
  sessao.add(
    Aviso(
      titulo=titulo,
      conteudo="Aviso de exemplo criado pelo popular_banco_local.",
      categoria=CategoriaAviso.COMUNICADO,
      autor_id=autor.id,
      setor_id=setor.id,
    )
  )
  print(f"Aviso criado em {setor.nome}")


def _garantir_evento(sessao: Session, autor: Usuario, setor: Setor) -> None:
  titulo = "Treinamento de exemplo"
  existe = sessao.scalar(select(Aviso).where(Aviso.titulo == titulo, Aviso.setor_id == setor.id))
  if existe:
    return
  # Daqui a uma semana, pra aparecer no calendário do mês corrente ou do próximo.
  inicio = (datetime.now(timezone.utc) + timedelta(days=7)).replace(
    hour=13, minute=0, second=0, microsecond=0
  )
  sessao.add(
    Aviso(
      titulo=titulo,
      conteudo="Evento de exemplo criado pelo popular_banco_local.",
      categoria=CategoriaAviso.EVENTO,
      data_inicio=inicio,
      data_fim=inicio + timedelta(hours=2),
      autor_id=autor.id,
      setor_id=setor.id,
    )
  )
  print(f"Evento criado em {setor.nome}")


def main() -> None:
  _garantir_banco_local()

  sessao = SessaoLocal()
  try:
    setores = {nome: _garantir_setor(sessao, nome, ramal) for nome, ramal in SETORES}
    usuarios = {
      email: _garantir_usuario(sessao, nome, email, papel, setores[setor] if setor else None)
      for nome, email, papel, setor in USUARIOS
    }

    admin_enfermagem = usuarios["admin.enfermagem@hospital.com.br"]
    _garantir_aviso(sessao, admin_enfermagem, setores["Enfermagem"])
    _garantir_evento(sessao, admin_enfermagem, setores["Enfermagem"])

    sessao.commit()
  finally:
    sessao.close()

  print(f"\nPronto. Usuários criados por este script usam a senha '{SENHA_PADRAO}':")
  for _, email, papel, setor in USUARIOS:
    print(f"  {email:<36} {papel.value:<12} {setor or '-'}")


if __name__ == "__main__":
  main()
