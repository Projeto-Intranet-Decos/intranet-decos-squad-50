from pathlib import Path
from typing import Literal, Self

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

RAIZ_BACKEND = Path(__file__).resolve().parents[2]
# O .env da raiz é o mesmo que o docker compose lê; o backend/.env, opcional, vale por cima dele.
# Variável de ambiente (a que o compose passa ao container) vence os dois.
ARQUIVOS_ENV = (RAIZ_BACKEND.parent / ".env", RAIZ_BACKEND / ".env")


class Configuracoes(BaseSettings):
    # Segredos levam repr=False: a configuração aparece em tracebacks e erros de validação.
    model_config = SettingsConfigDict(env_file=ARQUIVOS_ENV, extra="ignore")

    # No compose, host e porta são fixos (banco:5432); estes padrões são para rodar fora do Docker.
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "intranet"
    postgres_user: str = "intranet"
    postgres_password: str = Field(repr=False)

    jwt_secret: str = Field(repr=False)
    access_token_minutos: int = 30
    refresh_token_dias: int = 7

    # Só necessário em dev, quando frontend e backend rodam em portas diferentes.
    origens_cors: list[str] = []

    minio_endpoint: str = "localhost:9000"
    minio_usuario: str
    minio_senha: str = Field(repr=False)
    minio_bucket: str = "intranet"
    minio_seguro: bool = False

    # Tem que bater com o client_max_body_size do frontend/nginx.conf.
    tamanho_maximo_upload_mb: int = 50

    # E-mail (GER-19). "console" só escreve o e-mail no log; "smtp" envia de verdade.
    email_provedor: Literal["console", "smtp"] = "console"
    email_remetente: str = "Intranet <nao-responda@localhost>"
    # Base dos links dos e-mails (magic link, AUT-08).
    url_frontend: str = "http://localhost:5173"
    # Brevo por padrão; qualquer servidor SMTP serve. 587 usa STARTTLS, 465 já nasce em TLS.
    smtp_host: str = "smtp-relay.brevo.com"
    smtp_porta: int = 587
    # Na Brevo: o login SMTP e uma chave SMTP (não a chave de API xkeysib-...).
    smtp_usuario: str = ""
    smtp_senha: str = Field(default="", repr=False)

    convite_horas: int = 72
    redefinicao_senha_minutos: int = 60

    @model_validator(mode="after")
    def exigir_smtp_configurado(self) -> Self:
        if self.email_provedor == "smtp":
            faltando = [
                nome.upper()
                for nome in ("smtp_host", "smtp_usuario", "smtp_senha")
                if not getattr(self, nome)
            ]
            if faltando:
                raise ValueError(f"EMAIL_PROVEDOR=smtp exige {', '.join(faltando)}")
        return self

    @property
    def url_banco(self) -> URL:
        """URL de conexão montada das partes: cada uma é escapada, então a senha pode ter `@:/#%`."""
        return URL.create(
            "postgresql+psycopg2",
            username=self.postgres_user,
            password=self.postgres_password,
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        )


configuracoes = Configuracoes()
