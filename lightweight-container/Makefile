CC = gcc
CFLAGS = -Wall -Wextra -Iinclude -D_GNU_SOURCE

SRCS = src/main.c src/cli.c src/container.c src/process.c src/namespace.c src/cgroup.c src/monitor.c src/cleanup.c
OBJS = $(SRCS:.c=.o)
TARGET = container

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^

clean:
	rm -f $(OBJS) $(TARGET)
