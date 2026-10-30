import uuid

from sqlalchemy.orm import Session

from app.core.permissions import UsuarioAutenticado
from app.modules.logs import repository
from app.modules.logs.models import AcaoLog, Log, ModuloLog
from app.modules.logs.schemas import FiltroLogs, ListaLogs, LogResposta
from app.modules.usuarios.models import Usuario

TAMANHO_RESUMO = 500


def registrar(
    sessao: Session,
    ator: UsuarioAutenticado,
    acao: AcaoLog,
    modulo: ModuloLog,
    entidade_tipo: str,
    entidade_id: uuid.UUID,
    resumo: str,
) -> None:
    """Adiciona o registro de auditoria à sessão, sem commit.

    Chame antes do commit da escrita: assim o log vai na mesma transação e uma escrita que falha
    não deixa registro (LOG-02).
    """
    usuario = sessao.get(Usuario, ator.id)
    sessao.add(
        Log(
            usuario_id=ator.id,
            usuario_nome=usuario.nome if usuario else "",
            setor_id=ator.setor_id,
            acao=acao,
            modulo=modulo,
            entidade_tipo=entidade_tipo,
            entidade_id=entidade_id,
            resumo=resumo[:TAMANHO_RESUMO],
        )
    )


def listar_logs(sessao: Session, filtro: FiltroLogs) -> ListaLogs:
    itens, total = repository.listar(sessao, filtro)
    return ListaLogs(itens=[LogResposta.model_validate(i) for i in itens], total=total)
