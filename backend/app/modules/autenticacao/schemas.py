from datetime import date
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, StringConstraints

from app.modules.usuarios.schemas import Email, Senha, UsuarioResposta


class LoginEntrada(BaseModel):
  # Texto livre (e-mail malformado é só mais um 401), mas comparado como é gravado (USU-02).
  email: Annotated[str, AfterValidator(lambda email: email.strip().lower())]
  senha: str


class RefreshEntrada(BaseModel):
  refresh_token: str


class TokenResposta(BaseModel):
  access_token: str
  refresh_token: str
  token_type: str = "bearer"
  usuario: UsuarioResposta


class AccessTokenResposta(BaseModel):
  access_token: str
  token_type: str = "bearer"


class LinkEntrada(BaseModel):
  """Token de magic link (AUT-08): vai no corpo, nunca no path, pra ficar fora dos logs."""

  token: str


class ConviteResposta(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  email: str
  nome: str
  data_nascimento: date | None


class ConviteAceitar(LinkEntrada):
  # Só o nome é aparado: espaço na senha é parte da senha. E-mail, papel e setor vêm do
  # convite; se vierem no corpo, são ignorados.
  senha: Senha
  nome: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
  data_nascimento: date | None = None


class MensagemResposta(BaseModel):
  mensagem: str


class PedidoRedefinicao(BaseModel):
  email: Email


class RedefinicaoResposta(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  email: str


class RedefinicaoConfirmar(LinkEntrada):
  senha: Senha


class TrocaSenha(BaseModel):
  senha_atual: str
  senha_nova: Senha
