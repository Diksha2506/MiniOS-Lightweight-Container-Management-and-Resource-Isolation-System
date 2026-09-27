# Demonstration Workflow

This document provides a step-by-step workflow to demonstrate the Lightweight OS-Level Containerization system for an Operating Systems project presentation.

## Setup

1. **Environment:** Use a native Ubuntu Linux machine or a Virtual Machine (e.g., VirtualBox, WSL2) running Ubuntu. Ensure cgroups v2 is enabled.
2. **Compile:** Run `make` to build the `container` executable.
3. **Privileges:** All commands must be run as `root` (using `sudo`).

## Step 1: Create and Start a Container

Show that we can create an isolated environment with resource constraints.

```bash
# Create a container named 'demo1' with 100MB memory limit and 50% CPU limit
sudo ./container create demo1 --memory 100 --cpu 50 --command "/bin/bash"

# List containers (should show demo1 as STOPPED)
sudo ./container list

# Start the container
sudo ./container start demo1

# List again (should show demo1 as RUNNING)
sudo ./container list
```

## Step 2: Resource Monitoring (cgroups v2)

Run a background workload to demonstrate resource monitoring.

```bash
# In the running container, or by starting another command
sudo ./container create cpu-hog --cpu 30 --command "sh -c 'while true; do :; done'"
sudo ./container start cpu-hog

# View stats
sudo ./container stats cpu-hog
```

*Explain during presentation:* "Here we see the CPU limits being enforced by the Linux kernel via cgroups v2. The `monitor.c` module reads these exact values from `/sys/fs/cgroup/lightweight-containers/cpu-hog/cpu.stat`."

## Step 3: Process Isolation (Namespaces)

Demonstrate that the container has an isolated view.

```bash
# Create a container that lists its processes
sudo ./container create iso-test --command "ps aux"
sudo ./container start iso-test
```
*Explain during presentation:* "Because we use the `CLONE_NEWPID` flag when calling `clone()`, and we mount a private `/proc` in the new mount namespace, the container only sees its own processes, starting at PID 1."

## Step 4: Cleanup

Show proper lifecycle management.

```bash
# Stop running containers
sudo ./container stop demo1
sudo ./container stop cpu-hog

# Remove them
sudo ./container remove demo1
sudo ./container remove cpu-hog
sudo ./container remove iso-test

# List to confirm they are gone
sudo ./container list
```

## Conclusion
This demonstration highlights the foundational technologies (Namespaces for isolation, Cgroups for resource allocation) that power modern container engines like Docker.
