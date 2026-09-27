from fastapi import APIRouter, HTTPException
from ..services.engine import (
    list_containers,
    create_container,
    start_container,
    stop_container,
    remove_container,
    get_stats,
)
from ..schemas.models import (
    CreateContainerRequest,
    ContainerResponse,
    StatsResponse,
    ApiResponse,
)

router = APIRouter(prefix="/api/containers", tags=["containers"])


@router.get("", response_model=list[ContainerResponse])
def api_list():
    return list_containers()


@router.post("", response_model=ApiResponse)
def api_create(body: CreateContainerRequest):
    res = create_container(body.name, body.command, body.memory_mb, body.cpu_pct)
    if not res["ok"]:
        raise HTTPException(status_code=400, detail=res["stderr"] or res["stdout"])
    return ApiResponse(ok=True, message=res["stdout"].strip())


@router.get("/{name}", response_model=ContainerResponse)
def api_get(name: str):
    containers = list_containers()
    for c in containers:
        if c["name"] == name:
            return c
    raise HTTPException(status_code=404, detail=f"Container '{name}' not found.")


@router.post("/{name}/start", response_model=ApiResponse)
def api_start(name: str):
    res = start_container(name)
    if not res["ok"]:
        raise HTTPException(status_code=400, detail=res["stderr"] or res["stdout"])
    return ApiResponse(ok=True, message=res["stdout"].strip())


@router.post("/{name}/stop", response_model=ApiResponse)
def api_stop(name: str):
    res = stop_container(name)
    if not res["ok"]:
        raise HTTPException(status_code=400, detail=res["stderr"] or res["stdout"])
    return ApiResponse(ok=True, message=res["stdout"].strip())


@router.delete("/{name}", response_model=ApiResponse)
def api_remove(name: str):
    res = remove_container(name)
    if not res["ok"]:
        raise HTTPException(status_code=400, detail=res["stderr"] or res["stdout"])
    return ApiResponse(ok=True, message=res["stdout"].strip())


@router.get("/{name}/stats", response_model=StatsResponse)
def api_stats(name: str):
    data = get_stats(name)
    return StatsResponse(name=name, **data)
