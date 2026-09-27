#ifndef CGROUP_H
#define CGROUP_H

#include <sys/types.h>

int cgroup_create(const char *container_name);
int cgroup_set_memory_limit(const char *container_name, long limit_mb);
int cgroup_set_cpu_limit(const char *container_name, int limit_pct);
int cgroup_attach_task(const char *container_name, pid_t pid);
int cgroup_remove(const char *container_name);

#endif
