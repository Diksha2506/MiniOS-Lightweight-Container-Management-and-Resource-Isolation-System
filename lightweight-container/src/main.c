#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include "cli.h"

int main(int argc, char **argv) {
    if (geteuid() != 0) {
        fprintf(stderr, "Error: This program must be run as root (e.g., using sudo).\n");
        exit(EXIT_FAILURE);
    }
    
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <command> [args...]\n", argv[0]);
        fprintf(stderr, "Commands:\n");
        fprintf(stderr, "  create <name> [--memory <limit>] [--cpu <limit>] [--command <cmd>]\n");
        fprintf(stderr, "  start <name>\n");
        fprintf(stderr, "  stop <name>\n");
        fprintf(stderr, "  list\n");
        fprintf(stderr, "  stats <name>\n");
        fprintf(stderr, "  remove <name>\n");
        exit(EXIT_FAILURE);
    }

    return parse_and_execute(argc, argv);
}
