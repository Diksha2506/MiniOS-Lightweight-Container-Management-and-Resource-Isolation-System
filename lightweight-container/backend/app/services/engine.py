"""
Engine service: the ONLY place in the codebase that talks to the C binary.
All commands are whitelisted — no arbitrary shell execution is possible.
"""
from __future__ import annotations

import os
import platform
import re
import subprocess
from pathlib import Path
from typing import Any

# Absolute path to the compiled C binary (one level up from backend/)
ENGINE = Path(__file__).resolve().parents[3] / "container"

IS_LINUX = platform.system() == "Linux"

# --------------------------------------------------------------------------- #
# Low-level runner                                                              #
# --------------------------------------------------------------------------- #

ALLOWED_SUBCOMMANDS = {"list", "create", "start", "stop", "remove", "stats"}


def _run(*args: str) -> dict[str, Any]:
    """
    Run the C engine with the supplied arguments.
    Only whitelisted sub-commands may be executed.
    Returns {"ok": bool, "stdout": str, "stderr": str}.
    """
    if not args:
        return {"ok": False, "stdout": "", "stderr": "No command supplied."}

    if args[0] not in ALLOWED_SUBCOMMANDS:
        return {"ok": False, "stdout": "", "stderr": f"Sub-command '{args[0]}' is not permitted."}

    if not IS_LINUX:
        return _mock(*args)

    if not ENGINE.exists():
        return {
            "ok": False,
            "stdout": "",
            "stderr": (
                f"Container engine not found at {ENGINE}. "
                "Run 'make' in the project root first."
            ),
        }

    cmd = ["sudo", str(ENGINE)] + list(args)
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=15,
        )
        return {
            "ok": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
        }
    except FileNotFoundError:
        return {"ok": False, "stdout": "", "stderr": "sudo not found."}
    except subprocess.TimeoutExpired:
        return {"ok": False, "stdout": "", "stderr": "Engine timed out."}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "stdout": "", "stderr": str(exc)}


# --------------------------------------------------------------------------- #
# Mock mode (Windows / CI without root)                                         #
# --------------------------------------------------------------------------- #

_MOCK_CONTAINERS: dict[str, dict] = {}


def _mock(*args: str) -> dict[str, Any]:
    """Simulate engine behaviour so the UI can be demonstrated on any OS."""
    cmd = args[0]

    if cmd == "list":
        lines = ["NAME                 PID        STATE      MEM_LIMIT(MB)   CPU_LIMIT(%)"]
        for name, c in _MOCK_CONTAINERS.items():
            lines.append(
                f"{name:<20} {c['pid']:<10} {c['state']:<10} {c['mem_limit']:<15} {c['cpu_limit']:<15}"
            )
        return {"ok": True, "stdout": "\n".join(lines) + "\n", "stderr": ""}

    if cmd == "create":
        name = args[1]
        if name in _MOCK_CONTAINERS:
            return {"ok": False, "stdout": "", "stderr": f"Container {name} already exists."}
        mem = 0
        cpu = 0
        command = "/bin/sh"
        i = 2
        while i < len(args):
            if args[i] == "--memory" and i + 1 < len(args):
                mem = int(args[i + 1]); i += 2
            elif args[i] == "--cpu" and i + 1 < len(args):
                cpu = int(args[i + 1]); i += 2
            elif args[i] == "--command" and i + 1 < len(args):
                command = args[i + 1]; i += 2
            else:
                i += 1
        _MOCK_CONTAINERS[name] = {
            "pid": -1,
            "state": "STOPPED",
            "mem_limit": mem,
            "cpu_limit": cpu,
            "command": command,
        }
        return {"ok": True, "stdout": f"Container {name} created.\n", "stderr": ""}

    if cmd == "start":
        name = args[1]
        if name not in _MOCK_CONTAINERS:
            return {"ok": False, "stdout": "", "stderr": f"Container {name} not found."}
        c = _MOCK_CONTAINERS[name]
        if c["state"] == "RUNNING":
            return {"ok": False, "stdout": "", "stderr": f"Container {name} already running."}
        import random
        c["pid"] = random.randint(10000, 99999)
        c["state"] = "RUNNING"
        return {"ok": True, "stdout": f"Container {name} started with PID {c['pid']}.\n", "stderr": ""}

    if cmd == "stop":
        name = args[1]
        if name not in _MOCK_CONTAINERS:
            return {"ok": False, "stdout": "", "stderr": f"Container {name} not found."}
        c = _MOCK_CONTAINERS[name]
        if c["state"] == "STOPPED":
            return {"ok": False, "stdout": "", "stderr": f"Container {name} already stopped."}
        c["pid"] = -1
        c["state"] = "STOPPED"
        return {"ok": True, "stdout": f"Container {name} stopped.\n", "stderr": ""}

    if cmd == "remove":
        name = args[1]
        if name not in _MOCK_CONTAINERS:
            return {"ok": False, "stdout": "", "stderr": f"Container {name} not found."}
        if _MOCK_CONTAINERS[name]["state"] == "RUNNING":
            return {"ok": False, "stdout": "", "stderr": f"Stop {name} before removing."}
        del _MOCK_CONTAINERS[name]
        return {"ok": True, "stdout": f"Container {name} removed.\n", "stderr": ""}

    if cmd == "stats":
        name = args[1]
        if name not in _MOCK_CONTAINERS:
            return {"ok": False, "stdout": "", "stderr": f"Container {name} not found."}
        import random
        c = _MOCK_CONTAINERS[name]
        mem_used = random.randint(5, max(6, c["mem_limit"] - 2)) if c["state"] == "RUNNING" else 0
        cpu_ms = random.randint(100, 5000) if c["state"] == "RUNNING" else 0
        return {
            "ok": True,
            "stdout": (
                f"Stats for container: {name}\n"
                f"  Memory Usage: {mem_used} MB\n"
                f"  CPU Usage Time: {cpu_ms} ms\n"
            ),
            "stderr": "",
        }

    return {"ok": False, "stdout": "", "stderr": f"Unknown command: {cmd}"}


# --------------------------------------------------------------------------- #
# High-level helpers called by routes                                           #
# --------------------------------------------------------------------------- #

def list_containers() -> list[dict]:
    res = _run("list")
    if not res["ok"]:
        return []
    containers = []
    lines = res["stdout"].strip().splitlines()
    for line in lines[1:]:          # skip header
        parts = re.split(r"\s+", line.strip())
        if len(parts) >= 5:
            containers.append(
                {
                    "name": parts[0],
                    "pid": int(parts[1]),
                    "state": parts[2],
                    "mem_limit": int(parts[3]),
                    "cpu_limit": int(parts[4]),
                }
            )
    return containers


def create_container(name: str, command: str, memory: int, cpu: int) -> dict:
    args = ["create", name]
    if memory > 0:
        args += ["--memory", str(memory)]
    if cpu > 0:
        args += ["--cpu", str(cpu)]
    args += ["--command", command]
    return _run(*args)


def start_container(name: str) -> dict:
    return _run("start", name)


def stop_container(name: str) -> dict:
    return _run("stop", name)


def remove_container(name: str) -> dict:
    return _run("remove", name)


def get_stats(name: str) -> dict[str, Any]:
    res = _run("stats", name)
    if not res["ok"]:
        return {"memory_mb": None, "cpu_time_ms": None, "error": res["stderr"]}

    data: dict[str, Any] = {"memory_mb": None, "cpu_time_ms": None}
    for line in res["stdout"].splitlines():
        if "Memory Usage:" in line:
            m = re.search(r"(\d+)", line)
            if m:
                data["memory_mb"] = int(m.group(1))
        elif "CPU Usage Time:" in line:
            m = re.search(r"(\d+)", line)
            if m:
                data["cpu_time_ms"] = int(m.group(1))
    return data


def system_info() -> dict:
    """Gather host system information without executing user-supplied code."""
    import platform, os, re

    info: dict[str, Any] = {
        "os": platform.system(),
        "kernel": platform.release(),
        "arch": platform.machine(),
        "engine_path": str(ENGINE),
        "engine_exists": ENGINE.exists() if IS_LINUX else False,
        "is_linux": IS_LINUX,
        "mock_mode": not IS_LINUX,
        "cgroups_v2": False,
        "namespaces": [],
        "fs_isolation": True,
    }

    if IS_LINUX:
        # Detect cgroups v2
        try:
            with open("/proc/mounts") as f:
                for line in f:
                    if "cgroup2" in line:
                        info["cgroups_v2"] = True
                        break
        except OSError:
            pass

        # Detect supported namespaces
        ns_map = {
            "pid": "/proc/self/ns/pid",
            "mnt": "/proc/self/ns/mnt",
            "uts": "/proc/self/ns/uts",
            "net": "/proc/self/ns/net",
            "ipc": "/proc/self/ns/ipc",
            "user": "/proc/self/ns/user",
        }
        info["namespaces"] = [ns for ns, path in ns_map.items() if os.path.exists(path)]

        # Memory info
        try:
            mem: dict[str, int] = {}
            with open("/proc/meminfo") as f:
                for line in f:
                    parts = line.split()
                    if parts[0] in ("MemTotal:", "MemAvailable:"):
                        mem[parts[0].rstrip(":")] = int(parts[1]) * 1024
            info["mem_total_bytes"] = mem.get("MemTotal")
            info["mem_available_bytes"] = mem.get("MemAvailable")
        except OSError:
            pass
    else:
        info["cgroups_v2"] = False
        info["namespaces"] = ["pid", "mnt", "uts", "net", "ipc", "user"]  # advertised
        import psutil
        vm = psutil.virtual_memory()
        info["mem_total_bytes"] = vm.total
        info["mem_available_bytes"] = vm.available

    return info
