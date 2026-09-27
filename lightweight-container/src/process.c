#define _GNU_SOURCE
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>
#include "process.h"
#include "namespace.h"
#include "cgroup.h"

#define STACK_SIZE (1024 * 1024)

struct child_args {
    container_t *c;
};

static int child_process(void *arg) {
    struct child_args *args = (struct child_args *)arg;
    
    // Redirect stdout and stderr to a log file
    char log_path[256];
    snprintf(log_path, sizeof(log_path), "/tmp/containers/%s.log", args->c->name);
    FILE *log_file = fopen(log_path, "w");
    if (log_file) {
        dup2(fileno(log_file), STDOUT_FILENO);
        dup2(fileno(log_file), STDERR_FILENO);
        fclose(log_file);
    }

    // Setup namespaces
    if (namespace_setup(args->c->name) != 0) {
        fprintf(stderr, "Namespace setup failed\n");
        return 1;
    }

    // Split command
    char *argv[64];
    int argc = 0;
    char *token = strtok(args->c->command, " ");
    while (token && argc < 63) {
        argv[argc++] = token;
        token = strtok(NULL, " ");
    }
    argv[argc] = NULL;

    // Replace process image
    execvp(argv[0], argv);
    perror("execvp");
    return 1;
}

pid_t process_start_isolated(container_t *c) {
    char *stack = malloc(STACK_SIZE);
    if (!stack) {
        perror("malloc");
        return -1;
    }

    struct child_args *args = malloc(sizeof(struct child_args));
    args->c = c;

    // Use clone to create a new process with new namespaces
    int clone_flags = CLONE_NEWPID | CLONE_NEWUTS | CLONE_NEWNS | SIGCHLD;
    
    pid_t pid = clone(child_process, stack + STACK_SIZE, clone_flags, args);
    if (pid < 0) {
        perror("clone");
        free(stack);
        free(args);
        return -1;
    }

    // Attach to cgroup from the parent before it does much
    if (cgroup_attach_task(c->name, pid) != 0) {
        fprintf(stderr, "Failed to attach task to cgroup.\n");
        kill(pid, SIGKILL);
        return -1;
    }

    return pid;
}
