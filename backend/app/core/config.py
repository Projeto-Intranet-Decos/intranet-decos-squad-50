import ipaddress
from pathlib import Path
from typing import Literal, Self
from urllib.parse import urlsplit

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

RAIZ_BACKEND = Path(__file__).resolve().parents[2]
# O .env da raiz é o mesmo que o docker compose lê; o backend/.env, opcional, vale por cima dele.
# Variável de ambiente (a que o compose passa ao container) vence os dois.
ARQUIVOS_ENV = (RAIZ_BACKEND.parent / ".env", RAIZ_BACKEND / ".env")

# HS256 com chave menor que o tamanho do hash (32 bytes) fica sujeito a força bruta offline.
TAMANHO_MINIMO_JWT_SECRET = 32
JWT_SECRET_DE_EXEMPLO = "troque-este-segredo"


class Configuracoes(BaseSettings):
    # Segredos levam repr=False: a configuração aparece em tracebacks e erros de validação.
    # O alias é o nome da variável de ambiente (em inglês); validate_by_name aceita o do campo.
    # hide_input_in_errors: o erro de validação não repete o valor recebido (que pode ser o segredo).
    model_config = SettingsConfigDict(
        env_file=ARQUIVOS_ENV,
        extra="ignore",
        validate_by_name=True,
        validate_by_alias=True,
        hide_input_in_errors=True,
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
    # Atributo Secure do cookie do refresh token (AUT-07). Só desligue servindo a intranet em HTTP
    # puro: sem ele o navegador não guarda o cookie fora de https/localhost.
    cookie_seguro: bool = Field(default=True, validation_alias="COOKIE_SECURE")

    # Só necessário em dev, quando frontend e backend rodam em portas diferentes.
    origens_cors: list[str] = Field(default=[], validation_alias="CORS_ORIGINS")
    # /docs, /redoc e /openapi.json (GER-23): só em desenvolvimento.
    documentacao_api: bool = Field(default=False, validation_alias="API_DOCS")

    # Qualquer armazenamento compatível com S3 (o MinIO do compose, AWS S3, Railway Buckets...). Os
    # nomes das variáveis seguem o padrão da AWS, que é o que esses provedores injetam.
    # A URL traz o esquema (http/https), que decide o TLS.
    armazenamento_url: str = Field(default="http://localhost:9000", validation_alias="AWS_ENDPOINT_URL")
    armazenamento_chave: str = Field(validation_alias="AWS_ACCESS_KEY_ID")
    armazenamento_segredo: str = Field(repr=False, validation_alias="AWS_SECRET_ACCESS_KEY")
    armazenamento_bucket: str = Field(default="intranet", validation_alias="AWS_S3_BUCKET_NAME")
    # Sem região, o SDK descobre a do bucket com uma chamada a mais; no Railway ela é "auto".
    armazenamento_regiao: str | None = Field(default=None, validation_alias="AWS_DEFAULT_REGION")
    # Sem valor, decide pelo host (ver armazenamento_usa_path_style).
    armazenamento_path_style: bool | None = Field(
        default=None, validation_alias="AWS_S3_FORCE_PATH_STYLE"
    )

    # Tem que bater com o client_max_body_size do frontend/nginx.conf.template.
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

    @field_validator("armazenamento_regiao", "armazenamento_path_style", mode="before")
    @classmethod
    def vazio_vale_como_ausente(cls, valor: object) -> object:
        # O compose repassa ${AWS_DEFAULT_REGION:-}, que chega como texto vazio.
        return None if valor == "" else valor

    @field_validator("jwt_secret")
    @classmethod
    def exigir_jwt_secret_forte(cls, valor: str) -> str:
        # GER-24. A mensagem nunca repete o valor.
        if len(valor.encode()) < TAMANHO_MINIMO_JWT_SECRET or valor == JWT_SECRET_DE_EXEMPLO:
            raise ValueError(
                f"JWT_SECRET precisa de pelo menos {TAMANHO_MINIMO_JWT_SECRET} bytes aleatórios e não "
                'pode ser o do .env.example. Gere com: python -c "import secrets; '
                'print(secrets.token_urlsafe(64))"'
            )
        return valor

    @field_validator("armazenamento_url")
    @classmethod
    def exigir_url_do_armazenamento(cls, valor: str) -> str:
        partes = urlsplit(valor)
        if partes.scheme not in ("http", "https") or not partes.hostname or partes.path not in ("", "/"):
            raise ValueError(
                "AWS_ENDPOINT_URL precisa ser só esquema e host, ex: https://t3.storageapi.dev "
                "ou http://localhost:9000 (o bucket vai em AWS_S3_BUCKET_NAME)"
            )
        return valor

    @model_validator(mode="after")
    def exigir_provedor_de_email_configurado(self) -> Self:
        if self.email_provedor == "resend" and not self.resend_chave_api:
            raise ValueError("EMAIL_PROVIDER=resend exige RESEND_API_KEY")
        return self

    @property
    def armazenamento_endpoint(self) -> str:
        """host[:porta], o formato que o SDK do MinIO espera."""
        return urlsplit(self.armazenamento_url).netloc

    @property
    def armazenamento_seguro(self) -> bool:
        return urlsplit(self.armazenamento_url).scheme == "https"

    @property
    def armazenamento_usa_path_style(self) -> bool:
        """Path style (host/bucket) só onde o bucket não tem como virar subdomínio: localhost, IP e
        serviço do compose (nome sem ponto). O resto usa virtual-hosted (bucket.host), que é o que
        o Railway Buckets e a AWS usam. AWS_S3_FORCE_PATH_STYLE vence a regra."""
        if self.armazenamento_path_style is not None:
            return self.armazenamento_path_style
        host = urlsplit(self.armazenamento_url).hostname or ""
        try:
            ipaddress.ip_address(host)
            return True
        except ValueError:
            return host == "localhost" or "." not in host

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
