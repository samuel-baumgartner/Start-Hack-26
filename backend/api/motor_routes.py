"""Motor control API routes (MQTT run/stop publishing)."""

from __future__ import annotations

import asyncio
import socket
import time
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import paho.mqtt.client as mqtt

DEFAULT_HOST = "broker.hivemq.com"
DEFAULT_PORT = 1883
DEFAULT_TOPIC = "hackathon/REDACTED/motor-board/cmd"
DEFAULT_TOKEN = "REDACTED_MOTOR_TOKEN"

router = APIRouter(prefix="/motor", tags=["motor"])


class MotorTriggerRequest(BaseModel):
    alert_id: str | None = None
    host: str = DEFAULT_HOST
    port: int = DEFAULT_PORT
    topic: str = DEFAULT_TOPIC
    token: str = DEFAULT_TOKEN
    duration: float = Field(default=5.0, ge=0.1, le=120.0)
    run_repeat_interval: float = Field(default=0.5, ge=0.05, le=30.0)
    retries: int = Field(default=8, ge=1, le=30)
    retry_delay: float = Field(default=2.0, ge=0.1, le=30.0)
    retain: bool = False
    username: str | None = None
    password: str | None = None


def _connect_with_retry(
    client: mqtt.Client, host: str, port: int, retries: int, retry_delay: float
) -> None:
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            socket.getaddrinfo(host, port, 0, socket.SOCK_STREAM)
            client.connect(host, port, keepalive=30)
            return
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if attempt < retries:
                time.sleep(retry_delay)
    raise RuntimeError(f"Could not connect to MQTT broker after {retries} attempts") from last_error


def _publish_motor_sequence(req: MotorTriggerRequest) -> dict:
    client_id = f"motor-publisher-{uuid.uuid4().hex[:10]}"
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=client_id,
        protocol=mqtt.MQTTv311,
    )

    if req.username:
        client.username_pw_set(req.username, req.password)

    _connect_with_retry(client, req.host, req.port, req.retries, req.retry_delay)
    client.loop_start()

    run_payload = f"run:{req.token}"
    stop_payload = f"stop:{req.token}"

    try:
        end_time = time.time() + req.duration
        while True:
            run_result = client.publish(req.topic, run_payload, qos=1, retain=req.retain)
            run_result.wait_for_publish()
            now = time.time()
            if now >= end_time:
                break
            time.sleep(min(req.run_repeat_interval, end_time - now))

        stop_result = client.publish(req.topic, stop_payload, qos=1, retain=req.retain)
        stop_result.wait_for_publish()
    finally:
        client.loop_stop()
        client.disconnect()

    return {
        "status": "ok",
        "client_id": client_id,
        "topic": req.topic,
        "duration": req.duration,
        "alert_id": req.alert_id,
        "run_payload": run_payload,
        "stop_payload": stop_payload,
    }


@router.post("/trigger")
async def trigger_motor(req: MotorTriggerRequest):
    """Publish run, wait, then stop to motor MQTT topic."""
    try:
        return await asyncio.to_thread(_publish_motor_sequence, req)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Motor trigger failed: {exc}") from exc
