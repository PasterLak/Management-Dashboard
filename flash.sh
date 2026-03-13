#!/bin/bash

if [ ! -f "Makefile" ]; then
    echo "ERROR: Makefile not found in current directory"
    exit 1
fi

project_name=$(grep -E '^PROJECT_NAME\s*:=' Makefile | head -1 | sed 's/^PROJECT_NAME\s*:=\s*//')
if [ -z "$project_name" ]; then
    echo "ERROR: Could not find PROJECT_NAME in Makefile"
    exit 1
fi

port="/dev/ttyUSB0"

echo "================================================"
echo " PineCone BL602 Flashing Procedure"
echo "================================================"
echo "Project: $project_name"
echo "Port: $port"
echo "Firmware: build_out/${project_name}.bin"
echo ""

if [ ! -f "build_out/${project_name}.bin" ]; then
    echo "ERROR: Firmware file not found: build_out/${project_name}.bin"
    echo "Please compile the project first with ./compile.sh"
    exit 1
fi

echo "STEP 1: Prepare PineCone for flashing"
echo "----------------------------------------"
echo "1. Switch the PineCone to flashing mode:"
echo "   - Bridge the IO8 pin with H (High)"
echo "   - Press the reset button"
echo ""
echo "2. After completing the above steps, press Enter to continue..."
read -p "Press Enter when ready..."

echo ""
echo "STEP 2: Flashing firmware"
echo "----------------------------------------"
echo "Flashing firmware to device..."
echo "For VirtualBox users: add --baud-rate 230400 --initial-baud-rate 115200"
blflash flash "build_out/${project_name}.bin" --port "$port" --baud-rate 230400 --initial-baud-rate 115200

echo ""
echo "STEP 3: Prepare for operation"
echo "----------------------------------------"
echo "1. Switch the PineCone back to operating mode:"
echo "   - Bridge the IO8 pin with L (Low)"
echo ""
echo "2. After completing the above steps, press Enter to continue..."
read -p "Press Enter when ready..."

echo ""
echo "STEP 4: Start the program"
echo "----------------------------------------"
echo "1. Press the reset button on the PineCone to start the program."
echo ""
read -p "Press Enter when ready..."

echo ""
echo "STEP 5: Serial monitor"
echo "----------------------------------------"
echo "Starting serial monitor at 2000000 baud..."
echo "Press Ctrl+A then K to exit screen session"
echo "================================================"

screen "$port" 2000000

echo "================================================"
echo " Flashing and Serial Monitor session ended"
echo "================================================"