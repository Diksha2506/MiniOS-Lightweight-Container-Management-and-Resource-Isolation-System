#include <unistd.h>
#include "cleanup.h"
#include "cgroup.h"

int cleanup_container(const char *container_name) {
    // Attempt to remove the cgroup directory
    // Note: rmdir will fail if tasks are still attached.
    cgroup_remove(container_name);
    return 0;
}
