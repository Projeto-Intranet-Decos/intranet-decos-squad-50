"""GER-13 — conexão com o banco montada a partir das variáveis POSTGRES_*."""

import pytest
from sqlalchemy.engine import make_url

from app.core import config
from app.core.config import Configuracoes

VARIAVEIS_DO_BANCO = ["POSTGRES_HOST", "POSTGRES_PORT", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"]


@pytest.fixture(autouse=True)
def sem_variaveis_do_banco_no_ambiente(monkeypatch: pytest.MonkeyPatch) -> None:
    # Variável de ambiente vence os arquivos: o shell de quem roda os testes não pode interferir.
    for nome in VARIAVEIS_DO_BANCO:
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
        jwt_secret="segredo-jwt",
        minio_senha="senha-do-minio",
        smtp_senha="chave-smtp",
    )

    representacao = repr(configuracoes) + str(configuracoes)
    for segredo in ("senha-do-banco", "segredo-jwt", "senha-do-minio", "chave-smtp"):
        assert segredo not in representacao
