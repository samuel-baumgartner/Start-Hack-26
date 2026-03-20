#!/bin/bash

echo "========================================="
echo "Automatic retry upload script"
echo "Keep the board plugged in and hold it steady"
echo "This will try multiple times automatically"
echo "========================================="
echo ""

for attempt in {1..100}; do
    if [ -e "/dev/ttyUSB1" ]; then
        echo "[$attempt] Device found. Attempting upload..."
        
        timeout 30 python3 ~/.platformio/packages/tool-esptoolpy/esptool.py \
            --chip esp8266 \
            --port /dev/ttyUSB1 \
            --baud 460800 \
            --before no_reset_no_sync \
            --after hard_reset \
            write_flash \
            --flash_mode dio \
            --flash_freq 40m \
            --flash_size 4MB \
            0x0 .pio/build/nodemcuv2/firmware.bin 2>&1
        
        EXIT_CODE=$?
        
        if [ $EXIT_CODE -eq 0 ]; then
            echo ""
            echo "========================================="
            echo "✓✓✓ UPLOAD SUCCESSFUL! ✓✓✓"
            echo "========================================="
            exit 0
        fi
        
        echo "[$attempt] Failed. Retrying in 2 seconds..."
        sleep 2
    else
        echo "[$attempt] Waiting for /dev/ttyUSB1 to appear..."
        sleep 1
    fi
done

echo ""
echo "Reached maximum attempts. Please check:"
echo "1. Try a different USB port"
echo "2. Try connecting external power to the board (3.3V pin)"
echo "3. The board might be faulty"
