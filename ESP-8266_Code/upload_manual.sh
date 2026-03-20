#!/bin/bash

echo "Monitoring for NodeMCU on /dev/ttyUSB1..."
echo "Using --flash-size parameter to skip auto-detect..."
echo ""

RETRY_COUNT=0
MAX_RETRIES=50

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if [ -e "/dev/ttyUSB1" ]; then
        echo "Device detected! Starting upload attempt $((RETRY_COUNT + 1))..."
        python3 ~/.platformio/packages/tool-esptoolpy/esptool.py \
            --chip esp8266 \
            --port /dev/ttyUSB1 \
            --baud 115200 \
            --before default_reset \
            --after hard_reset \
            --no-stub \
            --flash_size 4MB \
            write_flash \
            --flash_mode dio \
            --flash_freq 40m \
            0x0 .pio/build/nodemcuv2/firmware.bin
        
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 0 ]; then
            echo ""
            echo "✓ Upload successful!"
            exit 0
        else
            echo ""
            echo "Upload failed."
            echo "Unplug and replug the board, then press Enter..."
            read -r
            RETRY_COUNT=$((RETRY_COUNT + 1))
        fi
    else
        echo "Waiting for device..."
    fi
    sleep 0.5
done

echo "Max retries reached. Giving up."
exit 1
