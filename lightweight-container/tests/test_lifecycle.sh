#!/bin/bash
set -e
echo "Testing Container Lifecycle..."

./container create test-lifecycle --memory 128 --cpu 20 --command "sleep 10"
./container start test-lifecycle
./container list
sleep 2
./container stats test-lifecycle
./container stop test-lifecycle
./container remove test-lifecycle
echo "Lifecycle test completed successfully."
