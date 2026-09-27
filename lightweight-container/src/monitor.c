#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "monitor.h"

#define CGROUP_BASE "/sys/fs/cgroup"
#define PROJECT_CGROUP CGROUP_BASE "/lightweight-containers"

static long read_cgroup_val(const char *container_name, const char *file) {
    char path[256];
    snprintf(path, sizeof(path), "%s/%s/%s", PROJECT_CGROUP, container_name, file);
    FILE *f = fopen(path, "r");
    if (!f) return -1;
    long val = -1;
    fscanf(f, "%ld", &val);
    fclose(f);
    return val;
}

int monitor_stats(const char *container_name) {
    long mem_current = read_cgroup_val(container_name, "memory.current");
    long mem_max = read_cgroup_val(container_name, "memory.max");
    
    // Simplistic CPU stat reading from cpu.stat
    char path[256];
    snprintf(path, sizeof(path), "%s/%s/cpu.stat", PROJECT_CGROUP, container_name);
    FILE *f = fopen(path, "r");
    long cpu_usage_usec = 0;
    if (f) {
        char key[64];
        long val;
        while (fscanf(f, "%63s %ld", key, &val) == 2) {
            if (strcmp(key, "usage_usec") == 0) {
                cpu_usage_usec = val;
                break;
            }
        }
        fclose(f);
    }

    printf("Stats for container: %s\n", container_name);
    if (mem_current != -1) {
        printf("  Memory Usage: %ld MB\n", mem_current / (1024 * 1024));
    } else {
        printf("  Memory Usage: N/A\n");
    }
    
    if (cpu_usage_usec > 0) {
        printf("  CPU Usage Time: %ld ms\n", cpu_usage_usec / 1000);
    } else {
        printf("  CPU Usage Time: N/A\n");
    }

    return 0;
}
