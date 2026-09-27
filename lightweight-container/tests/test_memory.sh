#!/bin/bash
set -e
echo "Testing Container Memory limits..."

# 5MB limit
./container create test-mem --memory 5 --command "python3 -c \"a = '1' * (10 * 1024 * 1024); import time; time.sleep(10)\""
./container start test-mem || true
sleep 3
# It should be OOM killed
./container list
./container stop test-mem || true
./container remove test-mem
echo "Memory limit test completed."
