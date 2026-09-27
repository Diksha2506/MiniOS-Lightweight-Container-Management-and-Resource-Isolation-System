# Architecture Document

## Overview
This project implements a lightweight OS-level containerization engine.

## Components
1. **CLI Module (cli.c/main.c)**: Exposes operations (`create`, `start`, `stop`, `list`, `stats`, `remove`).
2. **Container Module (container.c)**: Manages persistence of metadata to `/tmp/containers/`.
3. **Process Module (process.c)**: Uses the `clone()` system call with `CLONE_NEWPID`, `CLONE_NEWUTS`, and `CLONE_NEWNS`.
4. **Namespace Module (namespace.c)**: Sets up the child processes' isolated environment (hostname, private `/proc`).
5. **Cgroup Module (cgroup.c)**: Interfaces with `/sys/fs/cgroup/lightweight-containers/`. Configures `memory.max`, `cpu.max`, and attaches processes to `cgroup.procs`.
6. **Monitoring Module (monitor.c)**: Reads metrics directly from the cgroup pseudo-filesystem.

## Process Flow
When `start` is executed:
1. Validates state and loads container metadata.
2. Creates the cgroup directory.
3. Spawns child via `clone()`.
4. Parent attaches child PID to the cgroup.
5. Child mounts a fresh `/proc` and sets a custom hostname, then executes `execvp()`.
