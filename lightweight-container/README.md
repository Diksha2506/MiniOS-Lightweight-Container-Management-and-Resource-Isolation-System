# Lightweight OS-Level Containerization System (Advanced Edition)

This is an advanced Operating Systems academic project demonstrating how containerization works under the hood using Linux features such as namespaces and cgroups v2.

It features a lightweight C engine for OS-level operations and a modern React/Vite web dashboard powered by a Python FastAPI backend.

## Project Objectives
- Build a mini container runtime from scratch (C).
- Understand process isolation (Linux Namespaces) and resource constraints (cgroups v2).
- Provide a CLI to manage the lifecycle of these isolated environments.
- Provide a Professional Interactive Dashboard to visually demonstrate these OS concepts in real-time.

## Architecture
- **CLI Engine (C)**: Uses `clone()`, `execve()`, and `cgroups v2` to isolate processes.
- **Backend API (Python FastAPI)**: A lightweight wrapper that communicates with the C engine and provides a REST API. It strictly validates input and sanitizes commands.
- **Frontend UI (React/Vite)**: A dynamic, interactive web dashboard showcasing real-time container metrics, lifecycle management, and an OS Concepts Lab. Built with Tailwind CSS, Lucide Icons, and Recharts.

## Prerequisites
- **Ubuntu Linux** (or similar Linux distro with systemd/cgroups v2). Must be executed as `root` for actual Linux system calls.
- **Node.js & npm**: For running the React UI.
- **Python 3 & pip**: For running the FastAPI backend.
- GCC and Make.

*Note: This project cannot be run natively on Windows unless using WSL2 (Windows Subsystem for Linux), however, the API includes a mock mode for presentation on non-Linux platforms.*

## Installation & Setup

### 1. Compile the C Engine
```bash
make
```

### 2. Start the Backend API (FastAPI)
Open a terminal and navigate to the backend directory:
```bash
cd backend
pip install fastapi uvicorn pydantic psutil
# If on Linux, you must run this with sudo so it can execute the C engine with privileges
sudo python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Start the Frontend Dashboard (React/Vite)
Open a new terminal.
```bash
cd frontend
npm install
npm run dev
```
Navigate to the provided localhost URL (usually `http://localhost:5173`) in your browser.

## Using the Dashboard
- **Dashboard Overview**: Get a high-level view of system resources, total containers, and recent activities.
- **Container Management**: Start, stop, create, and remove containers visually.
- **Resource Monitoring**: Track CPU and Memory usage dynamically using interactive charts.
- **OS Concepts Lab**: A sandbox environment to test process isolation, memory limits, and CPU constraints visually.

## Testing (Phase 4)
We have comprehensive automated testing for both the API layer and the underlying Linux OS isolation layer.

### Running API Tests (Cross-Platform)
The FastAPI backend can be tested on any OS (including Windows) since it falls back to mock mode gracefully.
```bash
cd backend
pip install pytest httpx
pytest tests/ -v
```

### Running Linux Integration Tests
These tests verify that PID, UTS, filesystem (`pivot_root`), and resource limits actually work via the kernel. **These must be run on Ubuntu Linux as root.**
```bash
make
sudo ./tests/test_lifecycle.sh
sudo ./tests/test_fs_isolation.sh
```

## Limitations & Security Notice
- This is an academic learning prototype. It is **NOT secure** for production workloads.
- API is restricted to predefined subcommands (`create`, `start`, `stop`, `remove`, `stats`, `list`) to prevent arbitrary host command execution. Path traversal protections are enabled.
- Relies on cgroups v2. Will fail on older systems using cgroups v1.
