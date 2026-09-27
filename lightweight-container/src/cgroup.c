#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
#include <fcntl.h>
#include "cgroup.h"
#include <errno.h>

#define CGROUP_BASE "/sys/fs/cgroup"
#define PROJECT_CGROUP \
    CGROUP_BASE "/user.slice/user-1000.slice/user@1000.service/lightweight-containers"

static int write_to_cgroup_file(const char *path, const char *value) {
    FILE *f = fopen(path, "w");
    if (!f) {
        perror("fopen cgroup file");
        return -1;
    }
    if (fprintf(f, "%s", value) < 0) {
        perror("fprintf cgroup file");
        fclose(f);
        return -1;
    }
    fclose(f);
    return 0;
}

int cgroup_create(const char *container_name) {
    if (mkdir(PROJECT_CGROUP, 0755) != 0 && errno != EEXIST) {
        perror("mkdir project cgroup");
        return -1;
    }

    char path[256];
    snprintf(path, sizeof(path), "%s/%s", PROJECT_CGROUP, container_name);

    if (mkdir(path, 0755) != 0) {
        perror("mkdir container cgroup");
        return -1;
    }

    return 0;
}

int cgroup_set_memory_limit(const char *container_name, long limit_mb) {
    char path[256];
    char value[64];
    snprintf(path, sizeof(path), "%s/%s/memory.max", PROJECT_CGROUP, container_name);
    snprintf(value, sizeof(value), "%ld", limit_mb * 1024 * 1024);
    return write_to_cgroup_file(path, value);
}

int cgroup_set_cpu_limit(const char *container_name, int limit_pct) {
    char path[256];
    char value[64];
    snprintf(path, sizeof(path), "%s/%s/cpu.max", PROJECT_CGROUP, container_name);
    // Format for cpu.max is: MAX_QUOTA PERIOD. 100000 is default period (100ms)
    // To limit to limit_pct% of 1 CPU: quota = limit_pct * 1000
    long quota = limit_pct * 1000;
    snprintf(value, sizeof(value), "%ld 100000", quota);
    return write_to_cgroup_file(path, value);
}

int cgroup_attach_task(const char *container_name, pid_t pid) {
    char path[256];
    char value[32];
    snprintf(path, sizeof(path), "%s/%s/cgroup.procs", PROJECT_CGROUP, container_name);
    snprintf(value, sizeof(value), "%d", pid);
    return write_to_cgroup_file(path, value);
}

int cgroup_remove(const char *container_name) {
    char path[256];
    snprintf(path, sizeof(path), "%s/%s", PROJECT_CGROUP, container_name);
    rmdir(path);
    return 0;
}
