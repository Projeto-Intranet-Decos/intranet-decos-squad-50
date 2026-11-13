"""GER-13 — conexão com o banco montada a partir das variáveis POSTGRES_*."""

from urllib.parse import urlsplit

import pytest
from pydantic import ValidationError
from sqlalchemy.engine import make_url

from app.core import config
from app.core.armazenamento import criar_cliente
from app.core.config import Configuracoes

VARIAVEIS_DO_BANCO = ["POSTGRES_HOST", "POSTGRES_PORT", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"]
# As chaves de acesso ficam: o conftest garante um valor para elas.
VARIAVEIS_DO_ARMAZENAMENTO = [
    "AWS_ENDPOINT_URL", "AWS_S3_BUCKET_NAME", "AWS_DEFAULT_REGION", "AWS_S3_FORCE_PATH_STYLE",
]


@pytest.fixture(autouse=True)
def sem_variaveis_do_banco_no_ambiente(monkeypatch: pytest.MonkeyPatch) -> None:
    # Variável de ambiente vence os arquivos: o shell de quem roda os testes não pode interferir.
    for nome in VARIAVEIS_DO_BANCO + VARIAVEIS_DO_ARMAZENAMENTO:
        monkeypatch.delenv(nome, raising=False)


def test_ger13_url_do_banco_montada_das_variaveis():
    configuracoes = Configuracoes(
        _env_file=None,
        postgres_host="banco",
        postgres_port=5433,
        postgres_db="intranet",
        postgres_user="usuario",
        postgres_password="senha",
    )

    url = configuracoes.url_banco

    assert url.drivername == "postgresql+psycopg2"
    assert (url.host, url.port, url.database, url.username, url.password) == (
        "banco", 5433, "intranet", "usuario", "senha",
    )


def test_ger13_padroes_do_compose_e_senha_obrigatoria():
    configuracoes = Configuracoes(_env_file=None, postgres_password="senha")

    assert (configuracoes.postgres_host, configuracoes.postgres_port) == ("localhost", 5432)
    assert (configuracoes.postgres_db, configuracoes.postgres_user) == ("intranet", "intranet")
    with pytest.raises(ValueError, match="postgres_password"):
        Configuracoes(_env_file=None)


def test_ger13_senha_com_caracteres_especiais_sobrevive_a_url_em_texto():
    senha = "s3nh@:/#%?"
    configuracoes = Configuracoes(_env_file=None, postgres_password=senha)

    texto = configuracoes.url_banco.render_as_string(hide_password=False)

    assert make_url(texto).password == senha
    assert make_url(texto).host == "localhost"


def test_ger13_le_env_da_raiz_e_backend_env_por_cima(tmp_path, monkeypatch: pytest.MonkeyPatch):
    raiz = tmp_path / "raiz.env"
    raiz.write_text("POSTGRES_HOST=localhost\nPOSTGRES_DB=da_raiz\nPOSTGRES_PASSWORD=senha\n")
    backend = tmp_path / "backend.env"
    backend.write_text("POSTGRES_DB=do_backend\n")

    configuracoes = Configuracoes(_env_file=(raiz, backend))
    assert (configuracoes.postgres_host, configuracoes.postgres_db) == ("localhost", "do_backend")

    monkeypatch.setenv("POSTGRES_DB", "do_ambiente")
    assert Configuracoes(_env_file=(raiz, backend)).postgres_db == "do_ambiente"


def test_ger13_arquivos_env_padrao_sao_raiz_e_depois_backend():
    raiz_do_repositorio = config.RAIZ_BACKEND.parent

    assert Configuracoes.model_config["env_file"] == (
        raiz_do_repositorio / ".env",
        config.RAIZ_BACKEND / ".env",
    )


def test_ger13_segredos_nao_aparecem_na_representacao():
    configuracoes = Configuracoes(
        _env_file=None,
        postgres_password="senha-do-banco",
        jwt_secret="segredo-jwt-com-32-bytes-ou-mais-aqui",
        armazenamento_segredo="segredo-do-s3",
        resend_chave_api="re_chave-resend",
    )

    representacao = repr(configuracoes) + str(configuracoes)
    for segredo in (
        "senha-do-banco", "segredo-jwt-com-32-bytes-ou-mais-aqui", "segredo-do-s3", "re_chave-resend"
    ):
        assert segredo not in representacao


@pytest.mark.parametrize("segredo", ["curto", "x" * 31, "troque-este-segredo"])
def test_ger24_jwt_secret_fraco_impede_a_subida(segredo: str):
    with pytest.raises(ValidationError, match="JWT_SECRET") as erro:
        Configuracoes(_env_file=None, postgres_password="senha", jwt_secret=segredo)

    assert segredo not in str(erro.value)


def test_ger24_jwt_secret_com_32_bytes_vale():
    configuracoes = Configuracoes(_env_file=None, postgres_password="senha", jwt_secret="x" * 32)

    assert configuracoes.jwt_secret == "x" * 32


def test_ger23_documentacao_da_api_desligada_por_padrao(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("API_DOCS", raising=False)
    assert Configuracoes(_env_file=None, postgres_password="senha").documentacao_api is False

    monkeypatch.setenv("API_DOCS", "true")
    assert Configuracoes(_env_file=None, postgres_password="senha").documentacao_api is True


@pytest.mark.parametrize(
    ("variavel", "valor", "campo", "esperado"),
    [
        ("ACCESS_TOKEN_MINUTES", "15", "access_token_minutos", 15),
        ("REFRESH_TOKEN_DAYS", "3", "refresh_token_dias", 3),
        ("CORS_ORIGINS", '["http://localhost:5173"]', "origens_cors", ["http://localhost:5173"]),
        ("AWS_ENDPOINT_URL", "https://t3.storageapi.dev", "armazenamento_url", "https://t3.storageapi.dev"),
        ("AWS_ACCESS_KEY_ID", "chave", "armazenamento_chave", "chave"),
        ("AWS_SECRET_ACCESS_KEY", "segredo", "armazenamento_segredo", "segredo"),
        ("AWS_S3_BUCKET_NAME", "balde", "armazenamento_bucket", "balde"),
        ("AWS_DEFAULT_REGION", "auto", "armazenamento_regiao", "auto"),
        ("AWS_S3_FORCE_PATH_STYLE", "true", "armazenamento_path_style", True),
        ("MAX_UPLOAD_SIZE_MB", "20", "tamanho_maximo_upload_mb", 20),
        ("EMAIL_FROM", "Intranet <a@b.com>", "email_remetente", "Intranet <a@b.com>"),
        ("FRONTEND_URL", "http://intranet", "url_frontend", "http://intranet"),
        ("RESEND_API_KEY", "re_chave", "resend_chave_api", "re_chave"),
        ("INVITE_HOURS", "24", "convite_horas", 24),
        ("PASSWORD_RESET_MINUTES", "30", "redefinicao_senha_minutos", 30),
    ],
)
def test_ger13_variaveis_de_ambiente_em_ingles(
    monkeypatch: pytest.MonkeyPatch, variavel: str, valor: str, campo: str, esperado: object
):
    monkeypatch.setenv(variavel, valor)

    assert getattr(Configuracoes(_env_file=None, postgres_password="x"), campo) == esperado


def test_ger13_provedor_de_email_vem_de_email_provider(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("EMAIL_PROVIDER", "resend")
    monkeypatch.setenv("RESEND_API_KEY", "re_chave")

    assert Configuracoes(_env_file=None, postgres_password="x").email_provedor == "resend"


def _armazenamento(**campos: object) -> Configuracoes:
    return Configuracoes(_env_file=None, postgres_password="x", **campos)


def test_ger13_armazenamento_padrao_e_o_minio_local():
    configuracoes = _armazenamento()

    assert (configuracoes.armazenamento_endpoint, configuracoes.armazenamento_seguro) == (
        "localhost:9000", False,
    )
    assert configuracoes.armazenamento_bucket == "intranet"
    assert configuracoes.armazenamento_regiao is None


@pytest.mark.parametrize(
    ("url", "endpoint", "seguro"),
    [
        ("https://t3.storageapi.dev", "t3.storageapi.dev", True),
        ("https://t3.storageapi.dev/", "t3.storageapi.dev", True),
        ("http://armazenamento:9000", "armazenamento:9000", False),
        ("https://minio.hospital.com.br:9443", "minio.hospital.com.br:9443", True),
    ],
)
def test_ger13_endpoint_e_tls_vem_da_url(url: str, endpoint: str, seguro: bool):
    configuracoes = _armazenamento(armazenamento_url=url)

    assert (configuracoes.armazenamento_endpoint, configuracoes.armazenamento_seguro) == (endpoint, seguro)


@pytest.mark.parametrize(
    "url", ["t3.storageapi.dev", "localhost:9000", "ftp://t3.storageapi.dev", "https://t3.storageapi.dev/balde"]
)
def test_ger13_endpoint_sem_esquema_ou_com_caminho_e_recusado(url: str):
    with pytest.raises(ValidationError, match="AWS_ENDPOINT_URL"):
        _armazenamento(armazenamento_url=url)


def test_ger13_regiao_vazia_vale_como_ausente(monkeypatch: pytest.MonkeyPatch):
    # O compose repassa ${AWS_DEFAULT_REGION:-}, que chega como texto vazio.
    monkeypatch.setenv("AWS_DEFAULT_REGION", "")
    monkeypatch.setenv("AWS_S3_FORCE_PATH_STYLE", "")

    configuracoes = _armazenamento()

    assert configuracoes.armazenamento_regiao is None
    assert configuracoes.armazenamento_path_style is None


@pytest.mark.parametrize(
    ("url", "forcar", "path_style"),
    [
        ("http://localhost:9000", None, True),
        ("http://127.0.0.1:9000", None, True),
        ("http://[::1]:9000", None, True),
        ("http://armazenamento:9000", None, True),
        ("https://t3.storageapi.dev", None, False),
        ("https://s3.sa-east-1.amazonaws.com", None, False),
        ("https://minio.hospital.com.br", True, True),
        ("http://localhost:9000", False, False),
    ],
)
def test_ger13_path_style_so_para_host_local_salvo_se_forcado(url: str, forcar: bool | None, path_style: bool):
    configuracoes = _armazenamento(armazenamento_url=url, armazenamento_path_style=forcar)

    assert configuracoes.armazenamento_usa_path_style is path_style


@pytest.mark.parametrize(
    ("url", "regiao", "forcar", "host_esperado", "caminho_esperado"),
    [
        ("https://t3.storageapi.dev", "auto", None, "balde.t3.storageapi.dev", "/x.pdf"),
        ("http://armazenamento:9000", "us-east-1", None, "armazenamento:9000", "/balde/x.pdf"),
        ("https://minio.hospital.com.br", "us-east-1", True, "minio.hospital.com.br", "/balde/x.pdf"),
        ("https://s3.sa-east-1.amazonaws.com", "sa-east-1", None, "balde.s3.sa-east-1.amazonaws.com", "/x.pdf"),
        ("https://s3.sa-east-1.amazonaws.com", "sa-east-1", True, "s3.sa-east-1.amazonaws.com", "/balde/x.pdf"),
    ],
)
def test_ger13_cliente_monta_a_url_no_estilo_e_esquema_certos(
    url: str, regiao: str, forcar: bool | None, host_esperado: str, caminho_esperado: str
):
    # Com a região definida, a URL assinada sai sem chamada de rede.
    configuracoes = _armazenamento(
        armazenamento_url=url, armazenamento_regiao=regiao, armazenamento_path_style=forcar
    )

    assinada = urlsplit(criar_cliente(configuracoes).presigned_get_object("balde", "x.pdf"))

    assert (assinada.scheme, assinada.netloc, assinada.path) == (
        urlsplit(url).scheme, host_esperado, caminho_esperado,
    )
