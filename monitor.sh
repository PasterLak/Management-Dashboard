#!/bin/bash

port="/dev/ttyUSB0"

echo "PineCone Serial Monitor - Auto Reconnect"
echo "Port: $port"
echo "Baud: 2000000"
echo ""

while true; do
    if [ -e "$port" ]; then
        echo "V Connected to $port"
        echo "Press Ctrl+A then K to exit"
        echo "---------------------------"
        screen "$port" 2000000
        echo "---------------------------"
        echo "Disconnected from $port"
    else
        echo "X $port not available"
    fi
    
    echo "Waiting for device to reconnect..."
    echo "Check: USB cable, power, IO8=L"
    echo "Press Ctrl+C to stop monitoring"
    echo ""
    
    # Wait and check periodically
    for i in {1..10}; do
        sleep 3
        if [ -e "$port" ]; then
            echo "Device reconnected!"
            break
        fi
        echo -n "."
    done
    echo ""
done