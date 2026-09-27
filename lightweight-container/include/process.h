#ifndef PROCESS_H
#define PROCESS_H

#include <sys/types.h>
#include "container.h"

pid_t process_start_isolated(container_t *c);

#endif
