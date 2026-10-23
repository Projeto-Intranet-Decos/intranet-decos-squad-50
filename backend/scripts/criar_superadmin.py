"""Cria o primeiro superadmin, que não tem como ser criado pela API.

`POST /usuarios` exige um superadmin autenticado, então o banco recém-migrado
não tem nenhum caminho de entrada. Este script abre esse caminho uma vez.

    cd backend
    python -m scripts.criar_superadmin

Lê SUPERADMIN_NAME, SUPERADMIN_EMAIL e SUPERADMIN_PASSWORD do ambiente ou do
.env; o que faltar é perguntado no terminal. É idempotente: se já existir
usuário com o e-mail informado, não altera nada.
"""

import getpass
import sys
from pathlib import Path

RAIZ_BACKEND = Path(__file__).resolve().parents[1]
if str(RAIZ_BACKEND) not in sys.path:
  sys.path.insert(0, str(RAIZ_BACKEND))

from pydantic import Field, ValidationError  # noqa: E402
from pydantic_settings import BaseSettings, SettingsConfigDict  # noqa: E402

from app.core.config import ARQUIVOS_ENV  # noqa: E402
from app.core.database import SessaoLocal  # noqa: E402
from app.core.security import gerar_hash_senha  # noqa: E402
# Usuario tem FK pra setores: sem este import o metadata fica incompleto.
import app.modules.setores.models  # noqa: E402,F401
from app.modules.usuarios import repository  # noqa: E402
from app.modules.usuarios.models import Papel, Usuario  # noqa: E402
from app.modules.usuarios.schemas import Senha, UsuarioCriar  # noqa: E402


class DadosSuperadmin(UsuarioCriar):
  # O primeiro superadmin não tem quem o convide: a senha vem do ambiente (USU-05).
  senha: Senha


class ConfiguracoesBootstrap(BaseSettings):
  model_config = SettingsConfigDict(env_file=ARQUIVOS_ENV, extra="ignore")

  superadmin_nome: str | None = Field(default=None, validation_alias="SUPERADMIN_NAME")
  superadmin_email: str | None = None
  superadmin_senha: str | None = Field(default=None, validation_alias="SUPERADMIN_PASSWORD")


VARIAVEL_DO_CAMPO = {"nome": "SUPERADMIN_NAME", "email": "SUPERADMIN_EMAIL", "senha": "SUPERADMIN_PASSWORD"}


def _perguntar(rotulo: str, secreto: bool = False) -> str:
  if not sys.stdin.isatty():
    raise SystemExit(
      f"Faltou {rotulo}. Sem terminal interativo, defina SUPERADMIN_NAME, "
      "SUPERADMIN_EMAIL e SUPERADMIN_PASSWORD no ambiente ou no .env."
    )
  valor = (getpass.getpass(f"{rotulo}: ") if secreto else input(f"{rotulo}: ")).strip()
  if not valor:
    raise SystemExit(f"{rotulo} não pode ser vazio.")
  return valor


def main() -> None:
  configuracoes = ConfiguracoesBootstrap()

  nome = configuracoes.superadmin_nome or _perguntar(VARIAVEL_DO_CAMPO["nome"])
  email = configuracoes.superadmin_email or _perguntar(VARIAVEL_DO_CAMPO["email"])
  senha = configuracoes.superadmin_senha or _perguntar(VARIAVEL_DO_CAMPO["senha"], secreto=True)

  # Mesma validação da API, pra não criar um usuário que POST /usuarios recusaria.
  try:
    dados = DadosSuperadmin(nome=nome, email=email, senha=senha, role=Papel.superadmin)
  except ValidationError as erro:
    primeiro = erro.errors()[0]
    variavel = VARIAVEL_DO_CAMPO.get(str(primeiro["loc"][0]), "SUPERADMIN")
    raise SystemExit(f"{variavel}: {primeiro['msg']}") from erro

  sessao = SessaoLocal()
  try:
    existente = repository.buscar_por_email(sessao, dados.email)
    if existente:
      print(f"Já existe usuário com o e-mail {dados.email} (role {existente.role}). Nada a fazer.")
      return

    usuario = repository.criar(
      sessao,
      Usuario(
        nome=dados.nome,
        email=dados.email,
        senha_hash=gerar_hash_senha(dados.senha),
        role=dados.role,
        setor_id=None,
      ),
    )
    print(f"Superadmin criado: {usuario.email} (id {usuario.id}).")
  finally:
    sessao.close()


if __name__ == "__main__":
  main()
