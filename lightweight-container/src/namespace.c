#include <stdio.h>
#include <unistd.h>
#include <sys/mount.h>
#include <sys/syscall.h>
#include <sys/stat.h>
#include <string.h>
#include <stdlib.h>

#include "namespace.h"

// Helper to create dir if not exists
static void ensure_dir(const char *path) {
    mkdir(path, 0755);
}

// Helper for read-only bind mounts
static int bind_mount_ro(const char *src, const char *dest) {
    if (access(src, F_OK) != 0) return 0; // Skip if host doesn't have it
    ensure_dir(dest);
    if (mount(src, dest, NULL, MS_BIND | MS_REC, NULL) != 0) {
        perror("bind mount");
        return -1;
    }
    if (mount(src, dest, NULL, MS_BIND | MS_REMOUNT | MS_RDONLY | MS_REC, NULL) != 0) {
        perror("remount ro");
        return -1;
    }
    return 0;
}

int namespace_setup(const char *container_name) {
    // Set hostname (UTS namespace)
    if (sethostname(container_name, strlen(container_name)) != 0) {
        perror("sethostname");
        return -1;
    }

    // Remount / to make MS_PRIVATE so our mounts do not propagate to host
    if (mount(NULL, "/", NULL, MS_PRIVATE | MS_REC, NULL) != 0) {
        perror("mount / private");
        return -1;
    }

    // Prepare new rootfs
    char rootfs[256];
    snprintf(rootfs, sizeof(rootfs), "/tmp/containers/%s-rootfs", container_name);
    ensure_dir(rootfs);

    // Bind mount rootfs to itself (required for pivot_root)
    if (mount(rootfs, rootfs, "bind", MS_BIND | MS_REC, NULL) != 0) {
        perror("mount rootfs to itself");
        return -1;
    }

    // Bind mount essential host directories read-only
    char dest[512];
    const char *dirs[] = {"/bin", "/lib", "/lib64", "/usr", "/etc"};
    for (int i = 0; i < 5; i++) {
        snprintf(dest, sizeof(dest), "%s%s", rootfs, dirs[i]);
        bind_mount_ro(dirs[i], dest);
    }

    // Mount proc
    snprintf(dest, sizeof(dest), "%s/proc", rootfs);
    ensure_dir(dest);
    if (mount("proc", dest, "proc", 0, NULL) != 0) {
        perror("mount proc");
        return -1;
    }
    
    // Mount tmpfs on /dev and /tmp for container
    snprintf(dest, sizeof(dest), "%s/dev", rootfs);
    ensure_dir(dest);
    mount("tmpfs", dest, "tmpfs", 0, NULL);
    
    snprintf(dest, sizeof(dest), "%s/tmp", rootfs);
    ensure_dir(dest);
    mount("tmpfs", dest, "tmpfs", 0, NULL);

    // Create oldroot
    char oldroot[512];
    snprintf(oldroot, sizeof(oldroot), "%s/oldroot", rootfs);
    ensure_dir(oldroot);

    // pivot_root
    if (syscall(SYS_pivot_root, rootfs, oldroot) != 0) {
        perror("pivot_root");
        return -1;
    }

    // chdir to /
    if (chdir("/") != 0) {
        perror("chdir /");
        return -1;
    }

    // Unmount oldroot
    if (umount2("/oldroot", MNT_DETACH) != 0) {
        perror("umount oldroot");
        return -1;
    }
    rmdir("/oldroot");

    return 0;
}
