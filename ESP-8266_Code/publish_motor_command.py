#!/usr/bin/env python3
"""
Publish motor commands to HiveMQ:
1) send run:<token>
2) wait 5 seconds
3) send stop:<token>
"""

import argparse
import socket
import time
import uuid

import paho.mqtt.client as mqtt


DEFAULT_HOST = "broker.hivemq.com"
DEFAULT_PORT = 1883
DEFAULT_TOPIC = "hackathon/REDACTED/motor-board/cmd"
DEFAULT_TOKEN = "REDACTED_MOTOR_TOKEN"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Send run/stop motor commands via MQTT.")
    parser.add_argument("--host", default=DEFAULT_HOST, help="MQTT broker host")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="MQTT broker port")
    parser.add_argument("--topic", default=DEFAULT_TOPIC, help="MQTT topic")
    parser.add_argument("--token", default=DEFAULT_TOKEN, help="Shared token")
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
    parser.add_argument("--username", default=None, help="MQTT username (optional)")
    parser.add_argument("--password", default=None, help="MQTT password (optional)")
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
