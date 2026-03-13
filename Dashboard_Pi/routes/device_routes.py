"""
Device API endpoints - handle device data, updates, and actions
"""
from flask import request, jsonify
import simulator_manager
from datetime import datetime
from time import monotonic
from zoneinfo import ZoneInfo
import device_manager

_force_full_sync_nodes = set()
_request_rate_state = {}
BERLIN_TZ = ZoneInfo("Europe/Berlin")
RATE_RESET_AFTER_SEC = 3.0
RATE_EMA_ALPHA = 0.35


def _update_request_rate(node_id):
    now = monotonic()
    state = _request_rate_state.get(node_id)

    if not state:
        _request_rate_state[node_id] = {
            "last_request_monotonic": now,
            "request_rate_hz": 0.0,
        }
        return 0.0

    delta_sec = now - state["last_request_monotonic"]
    state["last_request_monotonic"] = now

    if delta_sec <= 0:
        return state["request_rate_hz"]

    if delta_sec > RATE_RESET_AFTER_SEC:
        state["request_rate_hz"] = 0.0
        return 0.0

    instantaneous_hz = 1.0 / delta_sec
    previous_hz = state["request_rate_hz"]
    if previous_hz <= 0:
        state["request_rate_hz"] = instantaneous_hz
    else:
        state["request_rate_hz"] = (
            RATE_EMA_ALPHA * instantaneous_hz
            + (1.0 - RATE_EMA_ALPHA) * previous_hz
        )

    return state["request_rate_hz"]


def get_devices():
    now = monotonic()
    devices = {}

    for node_id, device in device_manager.get_all_devices().items():
        device_copy = dict(device)
        state = _request_rate_state.get(node_id)

        if not state:
            device_copy["request_rate_hz"] = 0.0
        else:
            delta_sec = now - state["last_request_monotonic"]
            if delta_sec > RATE_RESET_AFTER_SEC:
                state["request_rate_hz"] = 0.0
                device_copy["request_rate_hz"] = 0.0
            else:
                device_copy["request_rate_hz"] = round(state["request_rate_hz"], 2)

        devices[node_id] = device_copy

    return devices


def _normalize_pin_display_data(pins):
    normalized = {}

    for gpio, pin_data in (pins or {}).items():
        if not isinstance(pin_data, dict):
            continue

        name = pin_data.get("n", pin_data.get("name", ""))
        if name == "X":
            name = "X Axis"
        elif name == "Y":
            name = "Y Axis"

        normalized[gpio] = {
            "n": name,
            "m": pin_data.get("m", pin_data.get("mode", "")),
            "v": pin_data.get("v", pin_data.get("value", "")),
        }

    return normalized

def process_device_data(data, remote_addr):
    # Extract data using the new short keys
    req_node_id = (data.get("id") or "").strip()
    if not req_node_id:
        return {"error": "id required"}, 400

    has_desc = "d" in data
    has_pins = "p" in data
    has_is_simulator = "is_simulator" in data
    
    # Get description and strictly limit it to 50 characters to save memory
    incoming_desc = (data.get("d") or "").strip()[:50] if has_desc else None
    incoming_pins = data.get("p") if has_pins else None
    incoming_is_simulator = bool(data.get("is_simulator")) if has_is_simulator else None
    
    # 'f' replaces 'full_sync'
    full_sync = bool(data.get("f", False))

    existing_device = device_manager.get_device(req_node_id)
    print(existing_device)
    node_id = req_node_id
    force_full_sync = False
    request_rate_hz = _update_request_rate(node_id)

    if not existing_device:
        _force_full_sync_nodes.add(node_id)
        description = incoming_desc if has_desc else ""
        pins = incoming_pins if has_pins else {}
        blink = False
    else:
        if has_desc and incoming_desc:
            description = incoming_desc
        else:
            description = existing_device.get("description", "")
        pins = _normalize_pin_display_data(
            _merge_pins(existing_device.get("pins", {}), incoming_pins, full_sync=full_sync)
        )
        blink = existing_device.get("blink", False)

    device_data = {
        "ip": remote_addr or "",
        "description": description,
        "last_seen": datetime.now(BERLIN_TZ).isoformat(timespec="milliseconds"),
        "request_rate_hz": round(request_rate_hz, 2),
        "pins": pins,
        "blink": blink,
    }

    if incoming_is_simulator is True:
        device_data["is_simulator"] = True
    elif existing_device and existing_device.get("is_simulator") is True:
        device_data["is_simulator"] = True

    device_manager.update_device(node_id, device_data)

    if node_id in _force_full_sync_nodes:
        if device_data.get("description") and device_data.get("pins"):
            _force_full_sync_nodes.discard(node_id)
        else:
            force_full_sync = True

    response = {
        "s": "ok",
        "id": node_id,
        "d": description[:50]
    }

    if blink:
        response["b"] = True # 'b' stands for blink
    if force_full_sync:
        response["ffs"] = True # 'ffs' stands for force_full_sync

    return response, 200

def _merge_pins(existing_pins, incoming_pins, full_sync=False):
    if incoming_pins is None:
        return existing_pins or {}

    if full_sync:
        return incoming_pins or {}

    merged = dict(existing_pins or {})
    for gpio, pin_data in (incoming_pins or {}).items():
        if pin_data is None:
            merged.pop(gpio, None)   
        else:
            merged[gpio] = pin_data
    return merged


def register_device_routes(app):
    """Register all device-related API routes"""
    
    @app.route("/api/data", methods=["POST"])
    def receive_data():
        data = request.json or {}
        resp, code = process_device_data(data, request.remote_addr)
        return jsonify(resp), code

    
    @app.route("/api/update_description", methods=["POST"])
    def update_description():
        """Update a device's description from web UI"""
        data = request.json or {}
        node_id = data.get("node_id")
        
        device = device_manager.get_device(node_id)
        if not device:
            return jsonify({"error": "not found"}), 404
        
        updated = dict(device)
        updated["description"] = data.get("description", "") or ""
        device_manager.update_device(node_id, updated)

        synced = simulator_manager.sync_simulator_descriptions(node_id, updated["description"])
        
        return jsonify({"status": "ok"})
    
    
    @app.route("/api/toggle_blink", methods=["POST"])
    def toggle_blink():
        """Toggle the blink flag for a device"""
        data = request.json or {}
        node_id = data.get("node_id")
        
        device = device_manager.get_device(node_id)
        if not device:
            return jsonify({"error": "not found"}), 404
        
        updated = dict(device)
        updated["blink"] = not device.get("blink", False)
        device_manager.update_device(node_id, updated)
        
        return jsonify({
            "status": "ok",
            "blink": updated["blink"]
        })
    
    
    @app.route("/api/delete_device", methods=["POST"])
    def delete_device():
        """Remove a device from the dashboard"""
        data = request.json or {}
        node_id = data.get("node_id")
        
        if not device_manager.delete_device(node_id):
            return jsonify({"error": "not found"}), 404

        if node_id:
            _force_full_sync_nodes.add(node_id)
            _request_rate_state.pop(node_id, None)
        
        return jsonify({"status": "ok"})

    
    @app.route("/api/devices", methods=["GET"])
    def get_devices_api():
        """Return all devices (polled by browser)"""
        return jsonify({
            "devices": get_devices(),
            "server_now_ms": int(datetime.now().timestamp() * 1000)
        })
