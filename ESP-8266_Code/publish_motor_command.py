#!/usr/bin/env python3
"""
Publish motor commands to HiveMQ:
1) send run:<token>
2) wait 5 seconds
3) send stop:<token>
"""

import argparse
import os
import socket
import time
import uuid
from pathlib import Path

import paho.mqtt.client as mqtt


DEFAULT_HOST = "broker.hivemq.com"
DEFAULT_PORT = 1883
DEFAULT_TOPIC = "hackathon/replace-me/motor-board/cmd"


def _load_env() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


def parse_args() -> argparse.Namespace:
    _load_env()
    parser = argparse.ArgumentParser(description="Send run/stop motor commands via MQTT.")
    parser.add_argument("--host", default=os.environ.get("MOTOR_MQTT_HOST", DEFAULT_HOST), help="MQTT broker host")
    parser.add_argument("--port", type=int, default=int(os.environ.get("MOTOR_MQTT_PORT", str(DEFAULT_PORT))), help="MQTT broker port")
    parser.add_argument("--topic", default=os.environ.get("MOTOR_MQTT_TOPIC", DEFAULT_TOPIC), help="MQTT topic")
    parser.add_argument("--token", default=os.environ.get("MOTOR_CMD_TOKEN"), help="Shared token")
    parser.add_argument("--duration", type=float, default=5.0, help="Seconds between run and stop")
    parser.add_argument(
        "--run-repeat-interval",
        type=float,
        default=0.5,
        help="Repeat run publish every N seconds during run window",
    )
    parser.add_argument("--retries", type=int, default=8, help="Connect retries on DNS/network errors")
    parser.add_argument("--retry-delay", type=float, default=2.0, help="Delay between retries (seconds)")
    parser.add_argument("--retain", action="store_true", default=False, help="Publish retained messages")
    parser.add_argument("--no-retain", dest="retain", action="store_false", help="Disable retained publish")
    parser.add_argument("--username", default=os.environ.get("MOTOR_MQTT_USERNAME"), help="MQTT username (optional)")
    parser.add_argument("--password", default=os.environ.get("MOTOR_MQTT_PASSWORD"), help="MQTT password (optional)")
    return parser.parse_args()


def connect_with_retry(
    client: mqtt.Client, host: str, port: int, retries: int, retry_delay: float
) -> None:
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            # DNS can intermittently fail on mobile hotspots; pre-check for clearer logs.
            socket.getaddrinfo(host, port, 0, socket.SOCK_STREAM)
            client.connect(host, port, keepalive=30)
            return
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            print(
                f"Connect attempt {attempt}/{retries} failed: {exc}. "
                f"Retrying in {retry_delay:.1f}s..."
            )
            if attempt < retries:
                time.sleep(retry_delay)

    raise RuntimeError(f"Could not connect to MQTT broker after {retries} attempts") from last_error


def main() -> None:
    args = parse_args()
    if not args.token:
        raise RuntimeError("Missing motor token. Set MOTOR_CMD_TOKEN in ESP-8266_Code/.env or pass --token.")

    client_id = f"motor-publisher-{uuid.uuid4().hex[:10]}"
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=client_id,
        protocol=mqtt.MQTTv311,
    )

    if args.username:
        client.username_pw_set(args.username, args.password)

    print(f"Connecting to {args.host}:{args.port} ...")
    connect_with_retry(client, args.host, args.port, args.retries, args.retry_delay)
    client.loop_start()

    run_payload = f"run:{args.token}"
    stop_payload = f"stop:{args.token}"

    print(f"Publishing to topic: {args.topic}")
    print(f"-> {run_payload} (repeating every {args.run_repeat_interval:.1f}s)")
    end_time = time.time() + args.duration
    while True:
        run_result = client.publish(args.topic, run_payload, qos=1, retain=args.retain)
        run_result.wait_for_publish()
        now = time.time()
        if now >= end_time:
            break
        time.sleep(min(args.run_repeat_interval, end_time - now))

    print(f"-> {stop_payload}")
    stop_result = client.publish(args.topic, stop_payload, qos=1, retain=args.retain)
    stop_result.wait_for_publish()

    client.loop_stop()
    client.disconnect()
    print("Done")


if __name__ == "__main__":
    main()
