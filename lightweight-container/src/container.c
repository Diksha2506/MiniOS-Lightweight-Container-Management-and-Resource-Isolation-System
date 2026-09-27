#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <signal.h>
#include <dirent.h>

#include "container.h"
#include "process.h"
#include "cgroup.h"
#include "cleanup.h"

#define METADATA_DIR "/tmp/containers"

static void ensure_metadata_dir() {
    mkdir(METADATA_DIR, 0755);
}

int save_container(const container_t *c) {
    ensure_metadata_dir();
    char path[256];
    snprintf(path, sizeof(path), "%s/%s.dat", METADATA_DIR, c->name);
    FILE *f = fopen(path, "wb");
    if (!f) return -1;
    fwrite(c, sizeof(container_t), 1, f);
    fclose(f);
    return 0;
}

int load_container(const char *name, container_t *c) {
    char path[256];
    snprintf(path, sizeof(path), "%s/%s.dat", METADATA_DIR, name);
    FILE *f = fopen(path, "rb");
    if (!f) return -1;
    fread(c, sizeof(container_t), 1, f);
    fclose(f);
    return 0;
}

int delete_container_record(const char *name) {
    char path[256];
    snprintf(path, sizeof(path), "%s/%s.dat", METADATA_DIR, name);
    return unlink(path);
}

int container_create(const char *name, const char *command, long memory_limit, int cpu_limit) {
    container_t c;
    if (load_container(name, &c) == 0) {
        fprintf(stderr, "Container %s already exists.\n", name);
        return 1;
    }
    strncpy(c.name, name, MAX_CONTAINER_NAME);
    strncpy(c.command, command, MAX_COMMAND_LEN);
    c.memory_limit_mb = memory_limit;
    c.cpu_limit_pct = cpu_limit;
    c.pid = -1;
    c.state = STATE_STOPPED;

    if (save_container(&c) != 0) {
        perror("save_container");
        return 1;
    }
    printf("Container %s created.\n", name);
    return 0;
}

int container_start(const char *name) {
    container_t c;
    if (load_container(name, &c) != 0) {
        fprintf(stderr, "Container %s not found.\n", name);
        return 1;
    }
    if (c.state == STATE_RUNNING) {
        fprintf(stderr, "Container %s is already running.\n", name);
        return 1;
    }

    if (cgroup_create(c.name) != 0) {
    fprintf(stderr, "Failed to create cgroup.\n");
    return 1;
    }

    if (c.memory_limit_mb > 0 &&
        cgroup_set_memory_limit(c.name, c.memory_limit_mb) != 0) {
        fprintf(stderr, "Failed to set memory limit.\n");
        cgroup_remove(c.name);
        return 1;
    }

    if (c.cpu_limit_pct > 0 &&
        cgroup_set_cpu_limit(c.name, c.cpu_limit_pct) != 0) {
        fprintf(stderr, "Failed to set CPU limit.\n");
        cgroup_remove(c.name);
        return 1;
    }

    pid_t pid = process_start_isolated(&c);
    if (pid < 0) {
        fprintf(stderr, "Failed to start isolated process.\n");
        return 1;
    }

    c.pid = pid;
    c.state = STATE_RUNNING;
    save_container(&c);
    printf("Container %s started with PID %d.\n", name, pid);
    return 0;
}

int container_stop(const char *name) {
    container_t c;
    if (load_container(name, &c) != 0) {
        fprintf(stderr, "Container %s not found.\n", name);
        return 1;
    }
    if (c.state == STATE_STOPPED) {
        fprintf(stderr, "Container %s is already stopped.\n", name);
        return 1;
    }

    kill(c.pid, SIGKILL);
    c.state = STATE_STOPPED;
    c.pid = -1;
    save_container(&c);
    
    // Attempt cleanup of cgroup
    cleanup_container(name);
    printf("Container %s stopped.\n", name);
    return 0;
}

int container_remove(const char *name) {
    container_t c;
    if (load_container(name, &c) != 0) {
        fprintf(stderr, "Container %s not found.\n", name);
        return 1;
    }
    if (c.state == STATE_RUNNING) {
        fprintf(stderr, "Cannot remove running container %s. Stop it first.\n", name);
        return 1;
    }
    delete_container_record(name);
    cleanup_container(name);
    printf("Container %s removed.\n", name);
    return 0;
}

int container_list(void) {
    ensure_metadata_dir();
    DIR *d = opendir(METADATA_DIR);
    if (!d) return 1;

    struct dirent *dir;
    printf("%-20s %-10s %-10s %-15s %-15s\n", "NAME", "PID", "STATE", "MEM_LIMIT(MB)", "CPU_LIMIT(%)");
    while ((dir = readdir(d)) != NULL) {
        if (strstr(dir->d_name, ".dat")) {
            char name[256];
            strncpy(name, dir->d_name, strlen(dir->d_name) - 4);
            name[strlen(dir->d_name) - 4] = '\0';
            
            container_t c;
            if (load_container(name, &c) == 0) {
                // If it claims running, check if process exists
                if (c.state == STATE_RUNNING && kill(c.pid, 0) == -1) {
                    c.state = STATE_STOPPED;
                    c.pid = -1;
                    save_container(&c);
                }
                printf("%-20s %-10d %-10s %-15ld %-15d\n", 
                    c.name, c.pid, c.state == STATE_RUNNING ? "RUNNING" : "STOPPED", 
                    c.memory_limit_mb, c.cpu_limit_pct);
            }
        }
    }
    closedir(d);
    return 0;
}
