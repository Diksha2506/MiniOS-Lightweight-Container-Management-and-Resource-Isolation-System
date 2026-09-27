from fastapi import APIRouter
from ..services.engine import system_info

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health():
    return {"status": "ok", "service": "container-engine-api"}


@router.get("/system")
def system():
    return system_info()
