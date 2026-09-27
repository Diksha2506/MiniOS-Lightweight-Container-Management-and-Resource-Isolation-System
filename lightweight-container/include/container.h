#ifndef CONTAINER_H
#define CONTAINER_H

#include <sys/types.h>
#include <stdbool.h>

#define MAX_CONTAINER_NAME 64
#define MAX_COMMAND_LEN 256

typedef enum {
    STATE_STOPPED,
    STATE_RUNNING
} container_state_t;

typedef struct {
    char name[MAX_CONTAINER_NAME];
    char command[MAX_COMMAND_LEN];
    long memory_limit_mb;
    int cpu_limit_pct;
    pid_t pid;
    container_state_t state;
} container_t;

// Core APIs
int container_create(const char *name, const char *command, long memory_limit, int cpu_limit);
int container_start(const char *name);
int container_stop(const char *name);
int container_remove(const char *name);
int container_list(void);

// Data persistence
int save_container(const container_t *c);
int load_container(const char *name, container_t *c);
int delete_container_record(const char *name);

#endif
