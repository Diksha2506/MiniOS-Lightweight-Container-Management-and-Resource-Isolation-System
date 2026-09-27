#!/bin/bash
set -e
echo "Testing Container Lifecycle and Edge Cases..."

if [ ! -f "./container" ]; then
    echo "Error: ./container binary not found. Run make first."
    exit 1
fi

# 1. Invalid inputs
echo "Testing invalid inputs..."
./container start nonexistent && exit 1 || echo "PASS: start nonexistent failed"
./container stop nonexistent && exit 1 || echo "PASS: stop nonexistent failed"
./container remove nonexistent && exit 1 || echo "PASS: remove nonexistent failed"

# 2. Duplicate names
echo "Testing duplicate names..."
./container create dup-test --command "sleep 10"
./container create dup-test --command "sleep 10" && exit 1 || echo "PASS: Duplicate create failed"

# 3. Create, Start, Stop, Remove
echo "Testing standard lifecycle..."
./container start dup-test
./container start dup-test && exit 1 || echo "PASS: Double start failed"

# Check if process is running
sleep 1
if ! ./container list | grep -q "dup-test.*RUNNING"; then
    echo "FAIL: Container is not running."
    exit 1
fi

./container remove dup-test && exit 1 || echo "PASS: Remove while running failed"

./container stop dup-test
./container stop dup-test && exit 1 || echo "PASS: Double stop failed"

./container remove dup-test
if ./container list | grep -q "dup-test"; then
    echo "FAIL: Container still exists in list."
    exit 1
fi
echo "PASS: Container removed."

# 4. Process crash/exit
echo "Testing process auto-exit..."
./container create exit-test --command "sleep 1"
./container start exit-test
sleep 2 # wait for sleep to finish

# The list command should update state to STOPPED since process died
./container list > /dev/null
if ! ./container list | grep -q "exit-test.*STOPPED"; then
    echo "FAIL: Container did not auto-transition to STOPPED."
    exit 1
fi
echo "PASS: Process auto-exit detected."
./container remove exit-test

echo "Lifecycle tests completed successfully!"
