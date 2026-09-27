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


import asyncio
import os
from fastapi import WebSocket, WebSocketDisconnect

@router.websocket("/{name}/logs")
async def websocket_logs(websocket: WebSocket, name: str):
    await websocket.accept()
    
    # Prevent path traversal
    if not name or "/" in name or ".." in name or not name.replace("-", "").replace("_", "").isalnum():
        await websocket.send_text("Error: Invalid container name.\n")
        await websocket.close()
        return

    log_path = f"/tmp/containers/{name}.log"
    
    try:
        # Mock mode fallback for Windows/Mac
        if os.name != 'posix':
            for i in range(10):
                await websocket.send_text(f"[Mock Log] Container {name} is running - tick {i}\n")
                await asyncio.sleep(2)
            await websocket.close()
            return

        # Real Linux mode: tail the file
        if not os.path.exists(log_path):
            await websocket.send_text(f"Waiting for log file: {log_path}...\n")
            while not os.path.exists(log_path):
                await asyncio.sleep(0.5)

        with open(log_path, "r") as f:
            while True:
                line = f.readline()
                if not line:
                    await asyncio.sleep(0.2)
                    continue
                await websocket.send_text(line)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_text(f"Error reading logs: {str(e)}\n")
