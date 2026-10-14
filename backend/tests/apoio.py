"""Helpers importáveis pelos testes (`from tests.apoio import autenticar`).

Só é importado depois do conftest.py, que prepara o ambiente antes de qualquer `import app`.
"""

import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import date
from functools import cache
from typing import BinaryIO

from sqlalchemy.orm import Session

from app.core import armazenamento
from app.core.security import criar_access_token, gerar_hash_senha
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
    ) -> Usuario:
        sufixo = uuid.uuid4().hex[:8]
        usuario = Usuario(
            nome=nome or f"Usuário {sufixo}",
            email=email or f"usuario-{sufixo}@teste.local",
            senha_hash=_hash_senha_padrao(),
            role=papel,
            setor_id=setor.id if setor else None,
            data_nascimento=data_nascimento,
            ativo=ativo,
        )
        self.sessao.add(usuario)
        self.sessao.flush()
        return usuario


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
