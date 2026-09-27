from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "container-engine-api"}

def test_system_info():
    response = client.get("/api/system")
    assert response.status_code == 200
    data = response.json()
    assert "os" in data
    assert "cgroups_v2" in data

def test_create_container_invalid_name():
    response = client.post("/api/containers", json={
        "name": "../invalid",
        "command": "echo",
        "memory_mb": 100,
        "cpu_pct": 50
    })
    assert response.status_code == 422 # Pydantic validation error

def test_create_container_valid():
    response = client.post("/api/containers", json={
        "name": "test-cont-1",
        "command": "echo hello",
        "memory_mb": 128,
        "cpu_pct": 50
    })
    assert response.status_code == 200
    assert response.json()["ok"] == True

def test_list_containers():
    response = client.get("/api/containers")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_get_container_not_found():
    response = client.get("/api/containers/nonexistent")
    assert response.status_code == 404

def test_websocket_path_traversal():
    with client.websocket_connect("/api/containers/invalid-../logs") as websocket:
        data = websocket.receive_text()
        assert "Error: Invalid container name" in data
