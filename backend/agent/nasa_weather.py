"""NASA Mars weather context fetcher for agent prompts.

This module fetches the latest public Mars weather snapshot from NASA's
InSight weather endpoint. The result is cached to avoid repeated outbound
requests during rapid agent tick loops.
"""

from __future__ import annotations

import json
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

NASA_INSIGHT_ENDPOINT = "https://api.nasa.gov/insight_weather/"
CACHE_TTL_SECONDS = 30 * 60  # 30 minutes
HTTP_TIMEOUT_SECONDS = 2.5

_cache_lock = threading.Lock()
_cache_payload: dict[str, Any] | None = None
_cache_fetched_at: float = 0.0


def _extract_metric(block: Any) -> dict[str, float] | None:
    if not isinstance(block, dict):
        return None

    av = block.get("av")
    mn = block.get("mn")
    mx = block.get("mx")
    if av is None and mn is None and mx is None:
        return None

    return {
        "avg": float(av) if av is not None else None,
        "min": float(mn) if mn is not None else None,
        "max": float(mx) if mx is not None else None,
    }


def _fetch_from_nasa() -> dict[str, Any]:
    api_key = os.environ.get("NASA_API_KEY", "DEMO_KEY")
    query = f"?api_key={api_key}&feedtype=json&ver=1.0"
    request = Request(
        NASA_INSIGHT_ENDPOINT + query,
        headers={"User-Agent": "flora-greenhouse-agent/1.0"},
        method="GET",
    )

    with urlopen(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
        status_code = getattr(response, "status", 200)
        if status_code != 200:
            raise RuntimeError(f"NASA API returned HTTP {status_code}")
        payload = json.loads(response.read().decode("utf-8"))

    sol_keys = payload.get("sol_keys")
    if not isinstance(sol_keys, list) or not sol_keys:
        raise RuntimeError("NASA payload did not include any sol data")

    latest_sol = sol_keys[-1]
    latest_block = payload.get(latest_sol, {})
    if not isinstance(latest_block, dict):
        latest_block = {}

    return {
        "source": "NASA InSight",
        "status": "ok",
        "latest_sol": latest_sol,
        "season": latest_block.get("Season"),
        "temperature_c": _extract_metric(latest_block.get("AT")),
        "pressure_pa": _extract_metric(latest_block.get("PRE")),
        "wind_m_s": _extract_metric(latest_block.get("HWS")),
    }


def get_nasa_weather_context(force_refresh: bool = False) -> dict[str, Any]:
    """Return cached NASA weather context for agent prompts.

    The function never raises; network and parsing failures are converted into
    a status payload that the caller can include as optional context.
    """
    global _cache_payload, _cache_fetched_at

    now = time.time()
    with _cache_lock:
        if (
            not force_refresh
            and _cache_payload is not None
            and (now - _cache_fetched_at) < CACHE_TTL_SECONDS
        ):
            return dict(_cache_payload)

    try:
        weather = _fetch_from_nasa()
    except (URLError, TimeoutError, ValueError, RuntimeError) as exc:
        weather = {
            "source": "NASA InSight",
            "status": "unavailable",
            "error": str(exc),
        }
    except Exception as exc:  # pragma: no cover
        weather = {
            "source": "NASA InSight",
            "status": "unavailable",
            "error": f"Unexpected fetch error: {exc}",
        }

    weather["fetched_at_utc"] = datetime.now(timezone.utc).isoformat()
    with _cache_lock:
        _cache_payload = weather
        _cache_fetched_at = now

    return dict(weather)
