from pathlib import Path
from typing import Literal, Self

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

CAMINHO_ENV = Path(__file__).resolve().parents[2] / ".env"


class Configuracoes(BaseSettings):
    model_config = SettingsConfigDict(env_file=CAMINHO_ENV, extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/intranet"

    jwt_secret: str
    access_token_minutos: int = 30
    refresh_token_dias: int = 7

    # Só necessário em dev, quando frontend e backend rodam em portas diferentes.
    origens_cors: list[str] = []

    minio_endpoint: str = "localhost:9000"
    minio_usuario: str
    minio_senha: str
    minio_bucket: str = "intranet"
    minio_seguro: bool = False

    # Tem que bater com o client_max_body_size do frontend/nginx.conf.
    tamanho_maximo_upload_mb: int = 50

    # E-mail (GER-19). "console" só escreve o e-mail no log; "mailgun" envia de verdade.
    email_provedor: Literal["console", "mailgun"] = "console"
    email_remetente: str = "Intranet <nao-responda@localhost>"
    # Base dos links dos e-mails (magic link, AUT-08).
    url_frontend: str = "http://localhost:5173"
    # Domain Sending Key, restrita ao domínio de envio (não a chave principal da conta).
    mailgun_api_key: str = ""
    mailgun_dominio: str = ""
    # https://api.mailgun.net (US) ou https://api.eu.mailgun.net (EU), conforme a conta.
    mailgun_url_base: str = "https://api.mailgun.net"

    convite_horas: int = 72
    redefinicao_senha_minutos: int = 60

    @model_validator(mode="after")
    def exigir_mailgun_configurado(self) -> Self:
        if self.email_provedor == "mailgun":
            faltando = [
                nome.upper()
                for nome in ("mailgun_api_key", "mailgun_dominio")
                if not getattr(self, nome)
            ]
            if faltando:
                raise ValueError(f"EMAIL_PROVEDOR=mailgun exige {', '.join(faltando)}")
        return self


configuracoes = Configuracoes()
