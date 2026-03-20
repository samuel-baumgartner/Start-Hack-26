#!/bin/bash

echo "Monitoring for NodeMCU on /dev/ttyUSB1..."
echo "Using --no-stub mode for better reliability..."
echo ""

while true; do
    if [ -e "/dev/ttyUSB1" ]; then
        echo "Device detected! Starting upload..."
        python3 ~/.platformio/packages/tool-esptoolpy/esptool.py \
            --chip esp8266 \
            --port /dev/ttyUSB1 \
            --baud 115200 \
            --before default_reset \
            --after hard_reset \
            --no-stub \
            write_flash 0x0 .pio/build/nodemcuv2/firmware.bin
        
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 0 ]; then
            echo ""
            echo "✓ Upload successful!"
            exit 0
        else
            echo ""
            echo "Upload failed, retrying..."
        fi
    fi
    sleep 0.5
done
