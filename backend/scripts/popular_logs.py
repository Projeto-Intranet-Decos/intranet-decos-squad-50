"""Popula a tabela `logs` com registros de exemplo, pra ver a tela de registro de atividades.

Só pra desenvolvimento. Pressupõe o banco migrado e os usuários do `popular_banco_local`.

    cd backend
    python -m scripts.popular_banco_local
    python -m scripts.popular_logs

Cria registros de todos os módulos e ações, espalhados pelos últimos dias, feitos pelos
usuários de exemplo. É idempotente: o id de cada registro é derivado da posição na lista,
então rodar de novo não duplica. Os registros são só auditoria; as entidades citadas nos
resumos não existem de fato (o log não tem FK, LOG-01).

Recusa rodar se DATABASE_URL não apontar pra localhost; use --forcar se o seu banco local
estiver em outro host.
"""

import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

RAIZ_BACKEND = Path(__file__).resolve().parents[1]
if str(RAIZ_BACKEND) not in sys.path:
  sys.path.insert(0, str(RAIZ_BACKEND))

from sqlalchemy import make_url, select  # noqa: E402

from app.core.config import configuracoes  # noqa: E402
from app.core.database import SessaoLocal  # noqa: E402
import app.modules.setores.models  # noqa: E402,F401
from app.modules.logs.models import AcaoLog, Log, ModuloLog  # noqa: E402
from app.modules.usuarios.models import Usuario  # noqa: E402

HOSTS_LOCAIS = {"localhost", "127.0.0.1", "::1"}
NAMESPACE = uuid.UUID("5f0c7b9e-3a1d-4c52-9e0a-6d2b8f41a7c3")

SUPER = "superadmin@hospital.com.br"
ENFERMAGEM = "admin.enfermagem@hospital.com.br"
TI = "admin.ti@hospital.com.br"

C, E, X = AcaoLog.CRIAR, AcaoLog.EDITAR, AcaoLog.EXCLUIR
MU, DO, DU, SE, US, AT = (
  ModuloLog.MURAIS,
  ModuloLog.DOCUMENTOS,
  ModuloLog.DUVIDAS,
  ModuloLog.SETORES,
  ModuloLog.USUARIOS,
  ModuloLog.ATALHOS,
)

# (há quantas horas, e-mail do autor, ação, módulo, tipo da entidade, resumo)
REGISTROS = [
  (2, ENFERMAGEM, C, MU, "aviso", "Nova escala de plantão administrativo"),
  (5, TI, E, MU, "aviso", "Manutenção programada dos sistemas"),
  (7, ENFERMAGEM, C, MU, "aviso", "Treinamento de higienização das mãos"),
  (9, SUPER, C, US, "usuario", "helena.prado@hospital.com.br"),
  (12, ENFERMAGEM, C, DO, "documento", "Punção venosa periférica"),
  (20, TI, C, DU, "faq", "Como redefinir minha senha da intranet?"),
  (26, SUPER, E, SE, "setor", "Centro cirúrgico"),
  (28, ENFERMAGEM, C, SE, "ramal", "Ramal 2450 · Enfermagem"),
  (31, TI, E, DO, "documento", "Acesso remoto (versão 2024)"),
  (36, SUPER, C, AT, "atalho", "Prontuário eletrônico"),
  (40, ENFERMAGEM, E, DU, "faq", "Como solicitar medicação de urgência?"),
  (47, ENFERMAGEM, E, MU, "aviso", "Nova escala de plantão administrativo"),
  (52, SUPER, X, US, "usuario", "carlos.mendes@hospital.com.br"),
  (55, TI, C, DO, "documento", "Política de senhas"),
  (60, SUPER, C, SE, "setor", "Laboratório de análises"),
  (64, TI, X, SE, "ramal", "Ramal 3009 · TI"),
  (71, ENFERMAGEM, X, DU, "faq", "Onde ficam os carrinhos de emergência?"),
  (75, SUPER, E, AT, "atalho", "Portal do colaborador"),
  (80, ENFERMAGEM, C, MU, "aviso", "Campanha de vacinação"),
  (86, TI, E, MU, "aviso", "Instabilidade na rede do 3º andar"),
  (93, SUPER, E, US, "usuario", "marina.alencar@hospital.com.br"),
  (99, ENFERMAGEM, E, DO, "documento", "Protocolo de queda"),
  (104, TI, C, DU, "faq", "Como conectar na rede Wi-Fi interna?"),
  (110, SUPER, X, AT, "atalho", "Sistema antigo de agendamento"),
  (118, ENFERMAGEM, X, MU, "aviso", "Convite: confraternização de fim de ano"),
  (125, TI, E, DO, "documento", "Acesso remoto (versão 2023)"),
  (131, SUPER, C, US, "usuario", "diego.matos@hospital.com.br"),
  (140, ENFERMAGEM, C, SE, "ramal", "Ramal 2001 · Enfermagem"),
  (148, TI, X, DO, "documento", "Manual do antigo sistema de chamados"),
  (156, SUPER, E, SE, "setor", "TI"),
  (163, ENFERMAGEM, E, MU, "aviso", "Campanha de vacinação"),
  (170, TI, C, MU, "aviso", "Novo Código de Conduta"),
  (178, SUPER, C, AT, "atalho", "Escala de plantão"),
  (185, ENFERMAGEM, C, DU, "faq", "Como registrar uma intercorrência?"),
  (192, TI, E, DU, "faq", "Como redefinir minha senha da intranet?"),
  (199, SUPER, X, SE, "setor", "Setor de testes"),
  (207, ENFERMAGEM, C, DO, "documento", "Fluxo de admissão de pacientes"),
  (215, TI, E, US, "usuario", "helena.prado@hospital.com.br"),
  (222, SUPER, E, US, "usuario", "diego.matos@hospital.com.br"),
  (230, ENFERMAGEM, E, SE, "ramal", "Ramal 2450 · Enfermagem"),
]


def _garantir_banco_local() -> None:
  host = make_url(configuracoes.database_url).host
  if host not in HOSTS_LOCAIS and "--forcar" not in sys.argv:
    raise SystemExit(
      f"DATABASE_URL aponta pra '{host}', que não parece local. "
      "Se for mesmo o seu banco de desenvolvimento, rode de novo com --forcar."
    )


def main() -> None:
  _garantir_banco_local()

  sessao = SessaoLocal()
  try:
    emails = {registro[1] for registro in REGISTROS}
    usuarios = {
      u.email: u for u in sessao.scalars(select(Usuario).where(Usuario.email.in_(emails)))
    }
    faltando = sorted(emails - usuarios.keys())
    if faltando:
      raise SystemExit(
        f"Faltam usuários de exemplo: {', '.join(faltando)}. "
        "Rode antes: python -m scripts.popular_banco_local"
      )

    agora = datetime.now(timezone.utc)
    criados = 0
    for posicao, (horas, email, acao, modulo, entidade_tipo, resumo) in enumerate(REGISTROS):
      log_id = uuid.uuid5(NAMESPACE, f"log-{posicao}")
      if sessao.get(Log, log_id):
        continue
      autor = usuarios[email]
      sessao.add(
        Log(
          id=log_id,
          usuario_id=autor.id,
          usuario_nome=autor.nome,
          setor_id=autor.setor_id,
          acao=acao,
          modulo=modulo,
          entidade_tipo=entidade_tipo,
          entidade_id=uuid.uuid5(NAMESPACE, f"entidade-{posicao}"),
          resumo=resumo,
          criado_em=agora - timedelta(hours=horas),
        )
      )
      criados += 1
    sessao.commit()
  finally:
    sessao.close()

  print(f"{criados} registro(s) de log criado(s) ({len(REGISTROS) - criados} já existiam).")


if __name__ == "__main__":
  main()
