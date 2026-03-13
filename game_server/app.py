from __future__ import annotations

import json
import os
import random
import time
from threading import Lock
from typing import Dict, Any, List
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")


TICK_RATE_HZ = 30
SPAWN_INTERVAL_MS = 1000
GAME_WIDTH = 20.0
GAME_HEIGHT = 14.0
PLAYER_Y = -GAME_HEIGHT / 2 + 2.5
PLAYER_SPEED_PER_SECOND = 12.5
CONE_SPEED_PER_SECOND = 9.375
CONE_CATCH_DISTANCE = 1.3
CONE_START_Y = GAME_HEIGHT / 2 + 2.0
CONE_END_Y = -GAME_HEIGHT / 2 - 2.0
TELEMETRY_STALE_MS = 3000
PLAYER_STALE_MS = 3000
WORLD_WRAP = True
REALTIME_BASE_URL = os.getenv("REALTIME_BASE_URL", "http://10.42.0.1").rstrip("/")
PLAYER_COLORS_COUNT = 10

state_lock = Lock()

state: Dict[str, Any] = {
    "tick": 0,
    "players": {},
    "pinecones": {},
    "next_cone_id": 1,
    "last_spawn_ms": int(time.time() * 1000),
    "last_telemetry_ms": 0,
}


def _clamp_target_x(value: Any) -> float:
    try:
        x = float(value)
    except (TypeError, ValueError):
        return 0.0
    if x > 1:
        return 1.0
    if x < -1:
        return -1.0
    return x


def _wrap_x(x: float) -> float:
    world_width = GAME_WIDTH
    limit = world_width / 2
    return ((x + limit) % world_width) - limit


def _clamp_x(x: float) -> float:
    limit = GAME_WIDTH / 2
    return max(-limit, min(limit, x))


def _distance_x(from_x: float, to_x: float) -> float:
    if WORLD_WRAP:
        return _shortest_dx(from_x, to_x)
    return to_x - from_x


def _next_player_x(current_x: float, delta: float) -> float:
    next_x = current_x + delta
    if WORLD_WRAP:
        return _wrap_x(next_x)
    return _clamp_x(next_x)


def _shortest_dx(from_x: float, to_x: float) -> float:
    world_width = GAME_WIDTH
    dx = to_x - from_x
    if dx > world_width / 2:
        dx -= world_width
    elif dx < -world_width / 2:
        dx += world_width
    return dx


def _snapshot() -> Dict[str, Any]:
    return {
        "tick": state["tick"],
        "worldWrap": WORLD_WRAP,
        "players": {pid: dict(pdata) for pid, pdata in state["players"].items()},
        "pinecones": {cid: dict(cdata) for cid, cdata in state["pinecones"].items()},
    }


def _spawn_pinecone() -> None:
    cone_id = str(state["next_cone_id"])
    state["next_cone_id"] += 1

    margin = 1.0
    x = random.uniform(-(GAME_WIDTH / 2 - margin), GAME_WIDTH / 2 - margin)
    state["pinecones"][cone_id] = {
        "id": cone_id,
        "x": x,
        "y": CONE_START_Y,
    }


def _extract_target_x(device_data: Dict[str, Any]) -> float:
    pins = device_data.get("pins")
    if not isinstance(pins, dict):
        return 0.0

    for pin in pins.values():
        if not isinstance(pin, dict):
            continue
        if pin.get("n") == "X Axis":
            return _clamp_target_x(pin.get("v", 0))

    return 0.0


def _is_truthy(value: Any) -> bool:
    if value is True:
        return True
    if isinstance(value, (int, float)):
        return value == 1
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return False

def _get_unique_color_index(players: Dict[str, Any]) -> int:
    used_indices = {p.get("colorIndex", -1) for p in players.values()}
    for i in range(PLAYER_COLORS_COUNT):
        if i not in used_indices:
            return i
    return len(players) % PLAYER_COLORS_COUNT

def _upsert_players_from_devices(payload: Dict[str, Any]) -> None:
    devices = payload.get("devices") if isinstance(payload, dict) else None
    if not isinstance(devices, dict):
        return

    for device_id, device_data in devices.items():
        if not isinstance(device_data, dict):
            continue

        target_x = _extract_target_x(device_data)
        display_name = str(device_data.get("description") or device_id).strip() or str(device_id)
        is_bot = _is_truthy(device_data.get("is_simulator"))

        player = state["players"].get(str(device_id))

        if player is None:
            color_index = _get_unique_color_index(state["players"])
            player = {
                "id": str(device_id),
                "name": display_name[:24],
                "x": 0.0,
                "y": PLAYER_Y,
                "score": 0,
                "targetX": 0.0,
                "direction": "right",
                "isBot": bool(is_bot),
                "nextBotUpdateMs": 0,
                "lastSeenMs": 0,
                "colorIndex": color_index,
            }
            state["players"][str(device_id)] = player

        player["name"] = display_name[:24]
        player["isBot"] = bool(is_bot)
        player["lastSeenMs"] = int(time.time() * 1000)
        if not player["isBot"]:
            player["targetX"] = target_x


def _apply_bot_ai(player: Dict[str, Any], now_ms: int) -> None:
    if not player.get("isBot"):
        return

    if now_ms < int(player.get("nextBotUpdateMs", 0)):
        return

    player_x = float(player.get("x", 0.0))
    player_y = PLAYER_Y

    found_cone = False
    if random.random() > 0.35 and state["pinecones"]:
        closest_cone = None
        min_dist_sq = float("inf")
        for cone in state["pinecones"].values():
            if cone.get("y", 0) <= player_y:
                continue
            dx = _distance_x(player_x, float(cone.get("x", 0)))
            dy = float(cone.get("y", 0)) - player_y
            dist_sq = dx * dx + dy * dy
            if dist_sq < min_dist_sq:
                min_dist_sq = dist_sq
                closest_cone = cone

        if closest_cone is not None:
            dx = _distance_x(player_x, float(closest_cone.get("x", 0)))
            if abs(dx) > 0.5:
                player["targetX"] = 1.0 if dx > 0 else -1.0
            else:
                player["targetX"] = _clamp_target_x(dx)
            player["nextBotUpdateMs"] = now_ms + 400
            found_cone = True

    if not found_cone:
        player["targetX"] = random.uniform(-1.0, 1.0)
        player["nextBotUpdateMs"] = now_ms + int(random.uniform(500, 1500))


def _reset_world_due_to_source_loss() -> None:
    state["players"].clear()
    state["pinecones"].clear()
    state["last_spawn_ms"] = int(time.time() * 1000)


def _advance_game(dt_s: float) -> None:
    players: Dict[str, Dict[str, Any]] = state["players"]
    pinecones: Dict[str, Dict[str, Any]] = state["pinecones"]
    now_ms = int(time.time() * 1000)

    last_telemetry_ms = int(state.get("last_telemetry_ms", 0))
    if last_telemetry_ms > 0 and (now_ms - last_telemetry_ms) > TELEMETRY_STALE_MS:
        _reset_world_due_to_source_loss()
        state["tick"] += 1
        return

    if players:
        if now_ms - state["last_spawn_ms"] >= SPAWN_INTERVAL_MS:
            _spawn_pinecone()
            state["last_spawn_ms"] = now_ms

    stale_players = []
    for player_id, player in players.items():
        last_seen_ms = int(player.get("lastSeenMs", 0))
        if last_seen_ms > 0 and (now_ms - last_seen_ms) > PLAYER_STALE_MS:
            stale_players.append(player_id)
    for player_id in stale_players:
        players.pop(player_id, None)

    for player in players.values():
        _apply_bot_ai(player, now_ms)
        target_x = _clamp_target_x(player.get("targetX", 0))
        player["x"] = _next_player_x(float(player.get("x", 0.0)), target_x * PLAYER_SPEED_PER_SECOND * dt_s)

        if target_x > 0:
            player["direction"] = "right"
        elif target_x < 0:
            player["direction"] = "left"

        player["y"] = PLAYER_Y

    to_remove_cones = set()

    for cone_id, cone in pinecones.items():
        cone["y"] -= CONE_SPEED_PER_SECOND * dt_s

        if cone["y"] < CONE_END_Y:
            to_remove_cones.add(cone_id)
            continue

        for player in players.values():
            dx = _distance_x(float(player["x"]), float(cone["x"]))
            dy = player["y"] - cone["y"]
            if (dx * dx + dy * dy) ** 0.5 <= CONE_CATCH_DISTANCE:
                player["score"] += 1
                to_remove_cones.add(cone_id)
                break

    for cone_id in to_remove_cones:
        pinecones.pop(cone_id, None)

    state["tick"] += 1


@socketio.on("connect")
def on_connect() -> None:
    with state_lock:
        snapshot = _snapshot()

    emit("state_snapshot", snapshot)


@socketio.on("disconnect")
def on_disconnect() -> None:
    pass


@socketio.on("reset_score")
def on_reset_score(payload: Dict[str, Any]) -> None:
    player_id = str((payload or {}).get("playerId") or "").strip()
    if not player_id:
        return

    with state_lock:
        player = state["players"].get(player_id)
        if not player:
            return
        player["score"] = 0
        snapshot = _snapshot()

    socketio.emit("state_update", snapshot)


def telemetry_loop() -> None:
    params = urlencode({"ids": "", "interval": "10"})
    stream_url = f"{REALTIME_BASE_URL}/api/realtime/stream?{params}"

    while True:
        try:
            with urlopen(stream_url, timeout=60) as response:
                event_name = None
                data_lines = []

                for raw in response:
                    line = raw.decode("utf-8", errors="ignore").rstrip("\r\n")

                    if line.startswith("event:"):
                        event_name = line[6:].strip()
                        continue

                    if line.startswith("data:"):
                        data_lines.append(line[5:].lstrip())
                        continue

                    if line == "":
                        if event_name == "devices" and data_lines:
                            try:
                                payload = json.loads("\n".join(data_lines))
                            except json.JSONDecodeError:
                                payload = None

                            if isinstance(payload, dict):
                                with state_lock:
                                    _upsert_players_from_devices(payload)
                                    state["last_telemetry_ms"] = int(time.time() * 1000)

                        event_name = None
                        data_lines = []
        except (URLError, TimeoutError, OSError):
            socketio.sleep(1)
            print("URL ERROR")
        except Exception:
            socketio.sleep(1)
            print("Failure")


def game_loop() -> None:
    interval_s = 1.0 / TICK_RATE_HZ
    last_tick_time = time.perf_counter()
    while True:
        now = time.perf_counter()
        dt_s = now - last_tick_time
        last_tick_time = now

        if dt_s <= 0:
            dt_s = interval_s
        elif dt_s > (interval_s * 1.5):
            dt_s = interval_s * 1.5

        with state_lock:
            _advance_game(dt_s)
            snapshot = _snapshot()
        socketio.emit("state_update", snapshot)
        socketio.sleep(interval_s)


if __name__ == "__main__":
    socketio.start_background_task(telemetry_loop)
    socketio.start_background_task(game_loop)
    socketio.run(app, host="0.0.0.0", port=8082, debug=False, allow_unsafe_werkzeug=True)