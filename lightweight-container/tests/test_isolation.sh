#!/bin/bash
set -e
echo "Testing Isolation..."

./container create test-iso --command "ps aux"
./container start test-iso
sleep 2
./container stop test-iso || true
./container remove test-iso
echo "Isolation test completed."
