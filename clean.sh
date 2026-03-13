#!/bin/bash

# clean.sh - Clean build artifacts for BL602 project

echo "Cleaning build artifacts..."

# Check if build_out exists
if [ -d "build_out" ]; then
    echo "Removing build_out directory..."
    rm -rf build_out
    echo "build_out directory removed successfully."
else
    echo "build_out directory not found - nothing to clean."
fi


echo "================================================"
echo "Cleanup completed!"
echo "================================================"