#!/bin/bash
set -e
echo "Testing Filesystem Isolation (pivot_root)..."

# Ensure we have the engine built
if [ ! -f "./container" ]; then
    echo "Error: ./container binary not found. Run make first."
    exit 1
fi

# Create a test file on the host in /tmp
echo "HOST_SECRET_DATA" > /tmp/host_secret.txt

# Create container that attempts to read the file
./container create test-fs --command "cat /tmp/host_secret.txt"
./container start test-fs
sleep 1

# Check the logs of the container
# Since /tmp in the container is a fresh tmpfs, the file should not exist, and it should fail.
if grep -q "HOST_SECRET_DATA" /tmp/containers/test-fs.log 2>/dev/null; then
    echo "FAIL: Container could read host /tmp file! Filesystem isolation failed."
    ./container stop test-fs || true
    ./container remove test-fs || true
    rm -f /tmp/host_secret.txt
    exit 1
else
    echo "PASS: Container could not read host /tmp file."
fi

# Clean up
./container stop test-fs || true
./container remove test-fs
rm -f /tmp/host_secret.txt
echo "Filesystem isolation test completed."
