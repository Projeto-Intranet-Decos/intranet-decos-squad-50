"""Sondagem OWASP Top 10 (2025). Cada teste afirma o comportamento seguro esperado.

Passa = controle presente. `xfail` = pendência levantada em docs/seguranca-owasp-top10.md: são
estritos, então quem corrigir vê o XPASS e tira a marca (e cria o ID no spec do domínio).
"""

import statistics
import time
import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Configuracoes, configuracoes
from app.modules.autenticacao.models import TokenAtualizacao
from app.modules.logs.models import Log
from tests.apoio import SENHA_PADRAO, autenticar


def pendencia(motivo: str):
    return pytest.mark.xfail(reason=f"OWASP {motivo}", strict=True)


def _login(cliente: TestClient, email: str, senha: str):
    return cliente.post("/auth/login", json={"email": email, "senha": senha})


def _documento(cliente, usuario, nome="pop.pdf", conteudo=b"%PDF-1.4 teste", setor_id=None):
    dados = {"titulo": "POP", "categoria": "outro"}
    if setor_id:
        dados["setor_id"] = str(setor_id)
    return cliente.post(
        "/documentos",
        data=dados,
        files={"arquivo": (nome, conteudo, "application/pdf")},
        headers=autenticar(usuario),
    )


# ---------- A01 Broken Access Control ----------


def test_a01_comum_nao_escreve(cliente, comum):
    r = cliente.post("/murais/avisos", data={"titulo": "x", "conteudo": "y"}, headers=autenticar(comum))
    assert r.status_code == 403


def test_a01_admin_setor_nao_acessa_usuarios(cliente, admin_setor):
    assert cliente.get("/usuarios", headers=autenticar(admin_setor)).status_code == 403
    assert cliente.get("/logs", headers=autenticar(admin_setor)).status_code == 403


def test_a01_admin_setor_nao_edita_documento_de_outro_setor(cliente, fabrica, superadmin, admin_setor):
    outro = fabrica.setor("Farmácia")
    doc = _documento(cliente, superadmin, setor_id=outro.id).json()
    r = cliente.put(f"/documentos/{doc['id']}", json={"titulo": "hack"}, headers=autenticar(admin_setor))
    assert r.status_code == 403
    r = cliente.delete(f"/documentos/{doc['id']}", headers=autenticar(admin_setor))
    assert r.status_code == 403


def test_a01_admin_setor_nao_cria_em_outro_setor(cliente, fabrica, admin_setor):
    outro = fabrica.setor("Farmácia")
    assert _documento(cliente, admin_setor, setor_id=outro.id).status_code == 403


def test_a01_visitante_nao_baixa_documento(cliente, superadmin, setor):
    doc = _documento(cliente, superadmin, setor_id=setor.id).json()
    assert cliente.get(f"/documentos/{doc['id']}/download").status_code == 401


@pendencia("A01: superadmin consegue se desativar (USU-04 ❓)")
def test_a01_superadmin_nao_desativa_a_si_mesmo(cliente, superadmin):
    """USU-04 ❓: o único superadmin pode se trancar fora do sistema."""
    r = cliente.delete(f"/usuarios/{superadmin.id}", headers=autenticar(superadmin))
    assert r.status_code in (400, 409, 422)


@pendencia("A01: risco aceito em AUT-10 enquanto a API ficar só na rede interna")
def test_a01_aniversariantes_exigem_login(cliente, fabrica, setor):
    """AUT-10 marca como risco aceito; vira pendência se a API ficar exposta fora da rede."""
    fabrica.usuario(setor=setor, data_nascimento=datetime.now().date())
    r = cliente.get("/murais/aniversariantes")
    assert r.status_code == 401, f"visitante leu {len(r.json())} aniversariante(s)"


# ---------- A02 Security Misconfiguration ----------


@pendencia("A02: /docs, /redoc e /openapi.json abertos")
@pytest.mark.parametrize("rota", ["/docs", "/redoc", "/openapi.json"])
def test_a02_documentacao_interativa_desligada(cliente, rota):
    assert cliente.get(rota).status_code == 404


@pendencia("A02: API sem headers de segurança")
def test_a02_headers_de_seguranca_na_api(cliente):
    r = cliente.get("/setores")
    faltando = [
        h for h in ("X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Cache-Control")
        if h not in r.headers
    ]
    assert not faltando, f"faltando: {faltando}"


@pendencia("A02: config aceita JWT_SECRET fraco")
def test_a02_jwt_secret_fraco_e_recusado():
    with pytest.raises(ValueError):
        Configuracoes(
            jwt_secret="troque-este-segredo",
            postgres_password="x",
            armazenamento_chave="x",
            armazenamento_segredo="x",
        )


def test_a02_cors_nao_reflete_origem_qualquer(cliente):
    r = cliente.get("/setores", headers={"Origin": "https://evil.example"})
    assert r.headers.get("access-control-allow-origin") != "https://evil.example"


# ---------- A04 Cryptographic Failures ----------


def test_a04_jwt_alg_none_recusado(cliente, superadmin):
    token = jwt.encode(
        {"sub": str(superadmin.id), "role": "superadmin", "setor_id": None,
         "exp": datetime.now(UTC) + timedelta(minutes=5)},
        key="", algorithm="none",
    )
    assert cliente.get("/usuarios", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_a04_jwt_com_role_adulterado_recusado(cliente, comum):
    token = autenticar(comum)["Authorization"].split()[1]
    payload = jwt.decode(token, options={"verify_signature": False})
    payload["role"] = "superadmin"
    forjado = jwt.encode(payload, "chave-errada-com-32-bytes-ou-mais!!", algorithm="HS256")
    assert cliente.get("/usuarios", headers={"Authorization": f"Bearer {forjado}"}).status_code == 401


def test_a04_refresh_token_guardado_so_como_hash(cliente, sessao: Session, comum):
    refresh = _login(cliente, comum.email, SENHA_PADRAO).json()["refresh_token"]
    hashes = sessao.scalars(select(TokenAtualizacao.token_hash)).all()
    assert refresh not in hashes


# ---------- A05 Injection ----------


@pytest.mark.parametrize("busca", ["' OR 1=1 --", "%' ; DROP TABLE documentos; --", "\\x00"])
def test_a05_busca_com_sqli_nao_quebra(cliente, superadmin, setor, busca):
    _documento(cliente, superadmin, setor_id=setor.id)
    r = cliente.get("/documentos", params={"busca": busca})
    assert r.status_code in (200, 422)
    assert r.status_code == 422 or r.json() == []


def test_a05_upload_html_disfarcado_nao_vira_html(cliente, superadmin, setor):
    doc = _documento(cliente, superadmin, nome="x.html", setor_id=setor.id)
    assert doc.status_code == 415


def test_a05_nome_de_arquivo_com_crlf_nao_injeta_header(cliente, superadmin, setor):
    doc = _documento(cliente, superadmin, nome="a\r\nSet-Cookie: x=1.pdf", setor_id=setor.id)
    if doc.status_code != 201:
        return
    r = cliente.get(f"/documentos/{doc.json()['id']}/download", headers=autenticar(superadmin))
    assert "set-cookie" not in r.headers


# ---------- A06 Insecure Design ----------


@pendencia("A06: login sem rate limit/bloqueio")
def test_a06_login_tem_limite_de_tentativas(cliente, comum):
    respostas = [_login(cliente, comum.email, "errada").status_code for _ in range(20)]
    assert 429 in respostas, "20 senhas erradas seguidas, nenhuma barrada"


@pendencia("A06: redefinição sem rate limit (USU-07 ❓)")
def test_a06_redefinicao_de_senha_tem_limite(cliente, comum):
    respostas = [
        cliente.post("/auth/redefinicao-senha", json={"email": comum.email}).status_code
        for _ in range(10)
    ]
    assert 429 in respostas, "10 pedidos seguidos para o mesmo e-mail, nenhum barrado"


@pendencia("A06: política de senha só exige 8 caracteres")
@pytest.mark.parametrize("senha", ["12345678", "password", "senha123"])
def test_a06_senha_trivial_recusada(cliente, comum, senha):
    r = cliente.put(
        "/auth/senha",
        json={"senha_atual": SENHA_PADRAO, "senha_nova": senha},
        headers=autenticar(comum),
    )
    assert r.status_code == 422


@pendencia("A06: upload confere só a extensão")
def test_a06_upload_confere_conteudo_e_nao_so_extensao(cliente, superadmin, setor):
    r = _documento(cliente, superadmin, nome="falso.pdf",
                   conteudo=b"<html><script>alert(1)</script></html>", setor_id=setor.id)
    assert r.status_code == 415


# ---------- A07 Authentication Failures ----------


@pendencia("A07: sem logout no backend (AUT-06 ⬜)")
def test_a07_existe_logout_que_revoga_refresh(cliente, comum):
    tokens = _login(cliente, comum.email, SENHA_PADRAO).json()
    r = cliente.post("/auth/logout", json={"refresh_token": tokens["refresh_token"]},
                     headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert r.status_code in (200, 204), f"/auth/logout respondeu {r.status_code}"
    assert cliente.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 401


@pendencia("A07: e-mail inexistente responde ~15x mais rápido")
def test_a07_login_nao_revela_conta_pelo_tempo(cliente, comum):
    def medir(email):
        tempos = []
        for _ in range(7):
            inicio = time.perf_counter()
            _login(cliente, email, "errada")
            tempos.append(time.perf_counter() - inicio)
        return statistics.median(tempos)

    existe = medir(comum.email)
    nao_existe = medir(f"ninguem-{uuid.uuid4().hex}@teste.local")
    assert existe / nao_existe < 3, f"existe {existe*1000:.1f} ms, não existe {nao_existe*1000:.1f} ms"


def test_a07_desativar_usuario_corta_refresh(cliente, comum, superadmin):
    tokens = _login(cliente, comum.email, SENHA_PADRAO).json()
    cliente.delete(f"/usuarios/{comum.id}", headers=autenticar(superadmin))
    assert cliente.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 401


@pendencia("A07: refresh token sem rotação (AUT-02)")
def test_a07_refresh_token_rotaciona(cliente, comum):
    tokens = _login(cliente, comum.email, SENHA_PADRAO).json()
    r = cliente.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert "refresh_token" in r.json(), "refresh token reutilizável por 7 dias, sem rotação"


@pendencia("A07: login diferencia maiúsculas no e-mail")
def test_a07_email_do_login_ignora_maiusculas(cliente, comum):
    assert _login(cliente, comum.email.upper(), SENHA_PADRAO).status_code == 200


# ---------- A09 Logging & Alerting ----------


@pendencia("A09: falha de login não é registrada")
def test_a09_login_falho_fica_registrado(cliente, sessao: Session, comum, caplog):
    antes = sessao.scalar(select(Log.id).limit(1))
    with caplog.at_level("INFO"):
        _login(cliente, comum.email, "errada")
    registrado = any(r.name.startswith("app") for r in caplog.records) or sessao.scalar(select(Log.id).limit(1)) != antes
    assert registrado, "falha de login não gera nenhum registro (log técnico ou auditoria)"


@pendencia("A09: acesso negado não é registrado")
def test_a09_403_fica_registrado(cliente, comum, caplog):
    with caplog.at_level("INFO"):
        cliente.get("/usuarios", headers=autenticar(comum))
    assert any(r.name.startswith("app") for r in caplog.records), "tentativa de acesso negado não gera registro"


def test_a09_escrita_gera_auditoria(cliente, sessao: Session, superadmin, setor):
    _documento(cliente, superadmin, setor_id=setor.id)
    assert sessao.scalar(select(Log).where(Log.modulo == "documentos")) is not None


# ---------- A10 Mishandling of Exceptional Conditions ----------


@pendencia("A10: 500 sai em text/plain, fora do contrato {mensagem}")
def test_a10_erro_inesperado_segue_contrato_e_nao_vaza(cliente, monkeypatch):
    from app.modules.setores import service

    def explode(*a, **k):
        raise RuntimeError("segredo interno: postgres://user:senha@host")

    monkeypatch.setattr(service, "listar_setores", explode)
    c = TestClient(cliente.app, raise_server_exceptions=False)
    r = c.get("/setores")
    assert r.status_code == 500
    assert "segredo" not in r.text
    assert r.headers["content-type"].startswith("application/json"), f"500 em {r.headers['content-type']}: {r.text!r}"


def test_a10_token_com_claims_invalidos_falha_fechado(cliente):
    for payload in ({"sub": "nao-uuid", "role": "comum"}, {"sub": str(uuid.uuid4()), "role": "deus"}, {}):
        payload["exp"] = datetime.now(UTC) + timedelta(minutes=5)
        token = jwt.encode(payload, configuracoes.jwt_secret, algorithm="HS256")
        r = cliente.post("/setores", json={"nome": "x"}, headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 401


def test_a10_json_malformado_vira_422(cliente):
    r = cliente.post("/auth/login", content=b"{nao json", headers={"Content-Type": "application/json"})
    assert r.status_code == 422
