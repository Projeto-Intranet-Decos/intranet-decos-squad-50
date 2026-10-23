from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import obter_sessao
from app.core.permissions import requer_superadmin
from app.modules.logs import service
from app.modules.logs.schemas import FiltroLogs, ListaLogs

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=ListaLogs, dependencies=[Depends(requer_superadmin)])
def listar_logs(filtro: FiltroLogs = Query(), sessao: Session = Depends(obter_sessao)):
    return service.listar_logs(sessao, filtro)
