"""Limite de tentativas por chave numa janela de tempo (AUT-11, USU-07).

Fica na memória do processo: a API roda com um worker só, e reiniciar zera os contadores
(trade-off aceito no spec). A chave é o e-mail normalizado, nunca o IP: no hospital todos os postos
saem pelo mesmo NAT.
"""

import math
import time
from collections import defaultdict, deque
from threading import Lock

# Trocado nos testes para controlar o tempo.
relogio = time.monotonic

_limites: list["LimiteDeTentativas"] = []


class LimiteDeTentativas:
    def __init__(self, maximo: int, janela_segundos: int) -> None:
        self.maximo = maximo
        self.janela = janela_segundos
        self._tentativas: defaultdict[str, deque[float]] = defaultdict(deque)
        # Os endpoints síncronos rodam no threadpool do FastAPI.
        self._trava = Lock()
        _limites.append(self)

    def _descartar_vencidas(self, chave: str, agora: float) -> deque[float]:
        tentativas = self._tentativas[chave]
        while tentativas and tentativas[0] <= agora - self.janela:
            tentativas.popleft()
        if not tentativas:
            del self._tentativas[chave]
        return tentativas

    def segundos_de_espera(self, chave: str) -> int:
        """0 se a chave ainda pode tentar; senão, quantos segundos até a mais antiga vencer."""
        with self._trava:
            agora = relogio()
            tentativas = self._descartar_vencidas(chave, agora)
            if len(tentativas) < self.maximo:
                return 0
            return max(1, math.ceil(tentativas[0] + self.janela - agora))

    def registrar(self, chave: str) -> None:
        with self._trava:
            self._tentativas[chave].append(relogio())

    def esquecer(self, chave: str) -> None:
        with self._trava:
            self._tentativas.pop(chave, None)

    def zerar(self) -> None:
        with self._trava:
            self._tentativas.clear()


def zerar_todos() -> None:
    """Para os testes: cada um começa sem tentativas registradas."""
    for limite in _limites:
        limite.zerar()
