#!/bin/bash
set -e

echo "=== Testing Optimized Ruvector ==="
echo

# Test 1: Small dataset
echo "Test 1: 50 vectors × 128 dimensions"
rm -f /tmp/test1.db
./target/release/ruvector benchmark --path /tmp/test1.db --num-vectors 50 --dimensions 128
echo

# Test 2: Medium dataset
echo "Test 2: 500 vectors × 256 dimensions"
rm -f /tmp/test2.db
./target/release/ruvector benchmark --path /tmp/test2.db --num-vectors 500 --dimensions 256
echo

# Test 3: Large dataset
echo "Test 3: 2000 vectors × 384 dimensions"
rm -f /tmp/test3.db
./target/release/ruvector benchmark --path /tmp/test3.db --num-vectors 2000 --dimensions 384
echo

echo "=== All tests completed successfully! ==="
