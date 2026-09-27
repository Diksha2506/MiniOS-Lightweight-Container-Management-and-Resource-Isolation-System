#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>
#include "cleanup.h"
#include "cgroup.h"

int cleanup_container(const char *container_name) {
    // Attempt to remove the cgroup directory
    // Note: rmdir will fail if tasks are still attached.
    cgroup_remove(container_name);
    
    // Remove the rootfs directory
    char cmd[512];
    snprintf(cmd, sizeof(cmd), "rm -rf /tmp/containers/%s-rootfs", container_name);
    system(cmd);
    
    return 0;
}
