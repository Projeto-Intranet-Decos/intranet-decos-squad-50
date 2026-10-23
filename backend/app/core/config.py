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
    # O alias é o nome da variável de ambiente (em inglês); validate_by_name aceita o do campo.
    model_config = SettingsConfigDict(
        env_file=ARQUIVOS_ENV, extra="ignore", validate_by_name=True, validate_by_alias=True
    )

    # No compose, host e porta são fixos (banco:5432); estes padrões são para rodar fora do Docker.
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "intranet"
    postgres_user: str = "intranet"
    postgres_password: str = Field(repr=False)

    jwt_secret: str = Field(repr=False)
    access_token_minutos: int = Field(default=30, validation_alias="ACCESS_TOKEN_MINUTES")
    refresh_token_dias: int = Field(default=7, validation_alias="REFRESH_TOKEN_DAYS")

    # Só necessário em dev, quando frontend e backend rodam em portas diferentes.
    origens_cors: list[str] = Field(default=[], validation_alias="CORS_ORIGINS")

    minio_endpoint: str = "localhost:9000"
    minio_usuario: str = Field(validation_alias="MINIO_USER")
    minio_senha: str = Field(repr=False, validation_alias="MINIO_PASSWORD")
    minio_bucket: str = "intranet"
    minio_seguro: bool = Field(default=False, validation_alias="MINIO_SECURE")

    # Tem que bater com o client_max_body_size do frontend/nginx.conf.
    tamanho_maximo_upload_mb: int = Field(default=50, validation_alias="MAX_UPLOAD_SIZE_MB")

    # E-mail (GER-22). "console" só escreve o e-mail no log; "resend" envia de verdade.
    email_provedor: Literal["console", "resend"] = Field(
        default="console", validation_alias="EMAIL_PROVIDER"
    )
    email_remetente: str = Field(
        default="Intranet <nao-responda@localhost>", validation_alias="EMAIL_FROM"
    )
    # Base dos links dos e-mails (magic link, AUT-08).
    url_frontend: str = Field(default="http://localhost:5173", validation_alias="FRONTEND_URL")
    resend_chave_api: str = Field(default="", repr=False, validation_alias="RESEND_API_KEY")

    convite_horas: int = Field(default=72, validation_alias="INVITE_HOURS")
    redefinicao_senha_minutos: int = Field(default=60, validation_alias="PASSWORD_RESET_MINUTES")

    @model_validator(mode="after")
    def exigir_provedor_de_email_configurado(self) -> Self:
        if self.email_provedor == "resend" and not self.resend_chave_api:
            raise ValueError("EMAIL_PROVIDER=resend exige RESEND_API_KEY")
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
