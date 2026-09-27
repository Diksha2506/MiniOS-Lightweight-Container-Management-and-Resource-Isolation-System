#include <stdio.h>
#include <unistd.h>
#include <sys/mount.h>
#include <string.h>

#include "namespace.h"

int namespace_setup(const char *container_name) {
    // Set hostname (UTS namespace)
    if (sethostname(container_name, strlen(container_name)) != 0) {
        perror("sethostname");
        return -1;
    }

    // Mount namespace configuration
    // Remount / to make MS_PRIVATE so our mounts do not propagate to host
    if (mount(NULL, "/", NULL, MS_PRIVATE | MS_REC, NULL) != 0) {
        perror("mount / private");
        return -1;
    }

    // Mount proc filesystem for the new PID namespace
    // Wait, since we are not doing a full pivot_root, we can just overmount /proc
    // However, overmounting /proc in MS_PRIVATE should be safe.
    if (mount("proc", "/proc", "proc", 0, NULL) != 0) {
        perror("mount /proc");
        return -1;
    }

    return 0;
}
