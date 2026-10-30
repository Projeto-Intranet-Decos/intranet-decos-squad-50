"""Helpers importáveis pelos testes (`from tests.apoio import autenticar`).

Só é importado depois do conftest.py, que prepara o ambiente antes de qualquer `import app`.
"""

import re
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from functools import cache
from typing import BinaryIO

import pytest
from sqlalchemy.orm import Session

from app.core import armazenamento, correio
from app.core.security import criar_access_token, gerar_hash_senha, gerar_token, hash_token
from app.modules.autenticacao.models import FinalidadeToken, TokenUsoUnico
from app.modules.setores.models import Setor
from app.modules.usuarios.models import Papel, Usuario

SENHA_PADRAO = "senha-de-teste"


def autenticar(usuario: Usuario) -> dict[str, str]:
    """Cabeçalho `Authorization` com um access token válido para o usuário."""
    return {"Authorization": f"Bearer {criar_access_token(usuario)}"}


@cache
def _hash_senha_padrao() -> str:
    # O hash é lento de propósito; calcular uma vez só deixa a suíte rápida.
    return gerar_hash_senha(SENHA_PADRAO)


class Fabrica:
    """Cria registros direto no banco do teste, para montar o cenário sem passar pela API.

    Todo usuário criado aqui tem a senha `SENHA_PADRAO`.
    """

    def __init__(self, sessao: Session) -> None:
        self.sessao = sessao

    def setor(self, nome: str | None = None) -> Setor:
        setor = Setor(nome=nome or f"Setor {uuid.uuid4().hex[:8]}")
        self.sessao.add(setor)
        self.sessao.flush()
        return setor

    def usuario(
        self,
        papel: Papel = Papel.comum,
        setor: Setor | None = None,
        *,
        nome: str | None = None,
        email: str | None = None,
        data_nascimento: date | None = None,
        ativo: bool = True,
        pendente: bool = False,
    ) -> Usuario:
        """`pendente=True` cria um convidado que ainda não ativou a conta (sem senha)."""
        sufixo = uuid.uuid4().hex[:8]
        usuario = Usuario(
            nome=nome or f"Usuário {sufixo}",
            email=email or f"usuario-{sufixo}@teste.local",
            senha_hash=None if pendente else _hash_senha_padrao(),
            role=papel,
            setor_id=setor.id if setor else None,
            data_nascimento=data_nascimento,
            ativo=ativo,
        )
        self.sessao.add(usuario)
        self.sessao.flush()
        return usuario

    def link(
        self,
        usuario: Usuario,
        finalidade: FinalidadeToken = FinalidadeToken.convite,
        *,
        expira_em: datetime | None = None,
        usado: bool = False,
    ) -> str:
        """Cria um magic link (AUT-08) e devolve o token em claro."""
        token = gerar_token()
        agora = datetime.now(UTC)
        self.sessao.add(
            TokenUsoUnico(
                usuario_id=usuario.id,
                finalidade=finalidade,
                token_hash=hash_token(token),
                expira_em=expira_em or agora + timedelta(hours=1),
                usado_em=agora if usado else None,
            )
        )
        self.sessao.flush()
        return token


@dataclass
class ObjetoArmazenado:
    conteudo: bytes
    tipo_conteudo: str


class ArmazenamentoFalso:
    """Substitui as funções de app/core/armazenamento.py por um dicionário em memória."""

    def __init__(self) -> None:
        self.objetos: dict[str, ObjetoArmazenado] = {}
        # True simula o MinIO fora do ar: as operações levantam ErroArmazenamento (503).
        self.indisponivel = False

    def _checar(self) -> None:
        if self.indisponivel:
            raise armazenamento.ErroArmazenamento("MinIO falso indisponível")

    def enviar_arquivo(self, chave: str, conteudo: BinaryIO, tamanho: int, tipo_conteudo: str) -> None:
        self._checar()
        self.objetos[chave] = ObjetoArmazenado(conteudo.read(tamanho), tipo_conteudo)

    def ler_arquivo(self, chave: str) -> Iterator[bytes]:
        self._checar()
        if chave not in self.objetos:
            raise armazenamento.ArquivoNaoEncontrado(chave)
        return iter([self.objetos[chave].conteudo])

    def mover_arquivo(self, origem: str, destino: str) -> None:
        self._checar()
        if origem not in self.objetos:
            raise armazenamento.ArquivoNaoEncontrado(origem)
        self.objetos[destino] = self.objetos.pop(origem)

    def remover_arquivo(self, chave: str) -> None:
        # Como o real, nunca levanta: no pior caso sobra um órfão.
        if not self.indisponivel:
            self.objetos.pop(chave, None)

    def armazenamento_disponivel(self) -> bool:
        return not self.indisponivel


class CorreioFalso:
    """Substitui a entrega de app/core/correio.py: guarda os e-mails em vez de enviar."""

    def __init__(self) -> None:
        self.enviados: list[correio.Email] = []
        # True simula o provedor fora do ar: a entrega levanta ErroEmail.
        self.indisponivel = False

    def entregar(self, email: correio.Email) -> bool:
        if self.indisponivel:
            raise correio.ErroEmail("Provedor de e-mail falso indisponível")
        self.enviados.append(email)
        return True

    def ultimo_token(self) -> str:
        """Token do magic link do último e-mail enviado."""
        if not self.enviados:
            pytest.fail("Nenhum e-mail foi enviado")
        achado = re.search(r"#token=([\w-]+)", self.enviados[-1].texto)
        if not achado:
            pytest.fail("O último e-mail não tem magic link")
        return achado.group(1)
