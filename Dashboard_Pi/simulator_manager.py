"""
Simulator management - background threads that simulate BL602 devices
"""
import json
import time
import threading
from datetime import datetime
from config import DEFAULT_MAX_SIMULATOR_RESPONSES

# Simulator state
simulator_threads = {}
simulator_stop_flags = {}
simulator_configs = {}
simulator_responses = {}
simulator_config_lock = threading.Lock()
simulator_pending_payloads = {}

def sync_simulator_descriptions(node_id, description):
    """Synchronize description into simulator payloads by node_id.

    Only simulators with autoUpdate=True are synchronized.
    """
    if not node_id:
        return 0

    updated_sim_ids = []
    new_description = str(description or "")

    with simulator_config_lock:
        for sim_id, cfg in simulator_configs.items():
            if not cfg.get("autoUpdate", True):
                continue

            payload = cfg.get("currentPayload")
            if not isinstance(payload, dict):
                continue

            normalized = _normalize_payload(sim_id, dict(payload))
            if normalized.get("id") != node_id:
                continue

            normalized["d"] = new_description
            cfg["currentPayload"] = normalized
            cfg["payload"] = normalized
            simulator_pending_payloads[sim_id] = normalized
            updated_sim_ids.append(sim_id)

    for sim_id in updated_sim_ids:
        add_log(sim_id, f'Description synced from device UI: "{new_description}"')

    return len(updated_sim_ids)

def _normalize_payload(sim_id, payload):
    """Ensure required payload shape for /api/data."""
    if not isinstance(payload, dict):
        payload = {}

    node_id = str(payload.get("id") or payload.get("node_id") or "").strip()
    if not node_id:
        node_id = f"sim_{sim_id}"

    description = payload.get("d", payload.get("description", ""))
    if description is None:
        description = ""

    pins = payload.get("p", payload.get("pins", {}))
    if not isinstance(pins, dict):
        pins = {}

    normalized_pins = {}
    for gpio, pin_data in pins.items():
        if not isinstance(pin_data, dict):
            continue

        normalized_pins[gpio] = {
            "n": pin_data.get("n", pin_data.get("name", "")),
            "m": pin_data.get("m", pin_data.get("mode", "")),
            "v": pin_data.get("v", pin_data.get("value", "")),
        }

    full_sync = bool(payload.get("f", payload.get("full_sync", False)))

    payload["id"] = node_id
    payload["d"] = str(description)
    payload["p"] = normalized_pins
    if full_sync:
        payload["f"] = True
    else:
        payload.pop("f", None)

    payload.pop("node_id", None)
    payload.pop("description", None)
    payload.pop("pins", None)
    payload.pop("full_sync", None)
    return payload


def _simulator_request_payload(payload):
    """Create API payload and mark it as simulator traffic."""
    out = _normalize_payload("simulator", dict(payload or {}))
    out["is_simulator"] = True
    return out


def get_timestamp():
    """Returns current time as HH:MM:SS string"""
    return datetime.now().strftime("%H:%M:%S")


def get_max_responses(sim_id):
    """Get max responses limit for a simulator"""
    if sim_id in simulator_configs:
        return simulator_configs[sim_id].get("maxResponses", DEFAULT_MAX_SIMULATOR_RESPONSES)
    return DEFAULT_MAX_SIMULATOR_RESPONSES


def add_log(sim_id, message):
    """Add a timestamped log entry to a simulator's console"""
    if sim_id not in simulator_responses:
        simulator_responses[sim_id] = []
    
    simulator_responses[sim_id].append(f"[{get_timestamp()}] {message}")
    
    # Keep only last N entries
    max_responses = get_max_responses(sim_id)
    if len(simulator_responses[sim_id]) > max_responses:
        simulator_responses[sim_id] = simulator_responses[sim_id][-max_responses:]


def simulator_worker(app, sim_id, interval_ms, payload_str, auto_update):
    """Background thread that simulates a BL602 device"""
    stop_flag = simulator_stop_flags[sim_id]
    interval_sec = interval_ms / 1000.0
    
    # Parse initial payload
    try:
        current_payload = _normalize_payload(sim_id, json.loads(payload_str))
    except:
        current_payload = _normalize_payload(sim_id, {})

    while not stop_flag["stop"]:
        try:
            with simulator_config_lock:
                config = simulator_configs.get(sim_id, {})
                should_auto_update = config.get("autoUpdate", auto_update)

                if sim_id in simulator_pending_payloads:
                    current_payload = _normalize_payload(sim_id, simulator_pending_payloads.pop(sim_id))
                elif "currentPayload" in config:
                    current_payload = _normalize_payload(sim_id, config["currentPayload"])
            
            # Send payload to API
            with app.test_client() as client:
                response = client.post("/api/data", json=_simulator_request_payload(current_payload))
                result = response.get_json()
                
                # Log response
                add_log(sim_id, json.dumps(result))
                
                if result and result.get("s") == "ok":
                    if result.get("ffs"):
                        current_payload = _normalize_payload(sim_id, current_payload)
                        current_payload["f"] = True
                        add_log(sim_id, "force_full_sync requested -> sending full payload next")
                    else:
                        current_payload.pop("f", None)

                    if should_auto_update:
                        if "id" in result:
                            current_payload["id"] = result["id"]
                        if "d" in result:
                            current_payload["d"] = result["d"]
                        print(f"[Simulator {sim_id}] Updated payload: {current_payload}")

                # Store current payload
                with simulator_config_lock:
                    config = simulator_configs.get(sim_id)
                    if config is not None:
                        config["currentPayload"] = current_payload
                
            print(f"[Simulator {sim_id}] Sent: {current_payload}")
        
        except Exception as e:
            add_log(sim_id, f"ERROR: {str(e)}")
            print(f"[Simulator {sim_id}] Error: {e}")
        
        # Sleep in small chunks to allow quick stop
        elapsed = 0
        while elapsed < interval_sec and not stop_flag["stop"]:
            time.sleep(0.1)
            elapsed += 0.1


def start_simulator(app, sim_id, interval, payload, auto_update, max_responses):
    """Start a new simulator thread"""
    if sim_id in simulator_threads and simulator_threads[sim_id].is_alive():
        return {"error": "already running"}, 400
    
    try:
        initial_payload = _normalize_payload(sim_id, json.loads(payload))
    except Exception:
        initial_payload = _normalize_payload(sim_id, {})

    # Store config
    with simulator_config_lock:
        simulator_configs[sim_id] = {
            "autoUpdate": auto_update,
            "maxResponses": max_responses,
            "currentPayload": initial_payload,
            "payload": initial_payload,
        }
    
    add_log(sim_id, "Simulator started")
    
    # Create stop flag
    simulator_stop_flags[sim_id] = {"stop": False}
    
    # Start thread
    thread = threading.Thread(
        target=simulator_worker,
        args=(app, sim_id, interval, payload, auto_update),
        daemon=True
    )
    thread.start()
    simulator_threads[sim_id] = thread
    
    return {"status": "started", "id": sim_id}, 200


def stop_simulator(sim_id):
    """Stop a running simulator"""
    if sim_id not in simulator_stop_flags:
        return {"error": "not found"}, 404
    
    add_log(sim_id, "Simulator stopped")
    
    # Signal stop
    simulator_stop_flags[sim_id]["stop"] = True
    
    # Wait for thread to finish
    if sim_id in simulator_threads:
        simulator_threads[sim_id].join(timeout=2.0)
        del simulator_threads[sim_id]
    
    del simulator_stop_flags[sim_id]
    with simulator_config_lock:
        if sim_id in simulator_configs:
            del simulator_configs[sim_id]
        simulator_pending_payloads.pop(sim_id, None)
    
    return {"status": "stopped", "id": sim_id}, 200


def get_simulator_status(sim_id):
    """Get current status and responses for a simulator"""
    # Return default state if never started
    if sim_id not in simulator_configs and sim_id not in simulator_responses:
        return {
            "id": sim_id,
            "running": False,
            "autoUpdate": True,
            "currentPayload": None,
            "responses": [],
            "never_started": True
        }, 200
    
    config = simulator_configs.get(sim_id, {})
    responses = simulator_responses.get(sim_id, [])
    
    return {
        "id": sim_id,
        "running": sim_id in simulator_threads and simulator_threads[sim_id].is_alive(),
        "autoUpdate": config.get("autoUpdate", True),
        "currentPayload": config.get("currentPayload"),
        "responses": responses,
    }, 200


def update_simulator_config(sim_id, auto_update):
    """Update simulator settings"""
    if sim_id not in simulator_configs:
        return {"error": "not found"}, 404
    
    with simulator_config_lock:
        simulator_configs[sim_id]["autoUpdate"] = auto_update
    return {"status": "updated", "id": sim_id}, 200


def update_simulator_payload(sim_id, payload_str, app=None):
    """Update simulator payload"""
    if sim_id not in simulator_configs:
        return {"error": "not found"}, 404
    
    try:
        payload = _normalize_payload(sim_id, json.loads(payload_str))
        with simulator_config_lock:
            simulator_configs[sim_id]["currentPayload"] = payload
            simulator_configs[sim_id]["payload"] = payload
            simulator_pending_payloads[sim_id] = payload

        is_running = sim_id in simulator_threads and simulator_threads[sim_id].is_alive()
        if app is not None and is_running:
            with app.test_client() as client:
                response = client.post("/api/data", json=_simulator_request_payload(payload))
                result = response.get_json()

                if result and result.get("ffs"):
                    retry_payload = dict(payload)
                    retry_payload["f"] = True
                    retry_payload.setdefault("p", {})
                    retry_payload.setdefault("d", "")
                    response = client.post("/api/data", json=_simulator_request_payload(retry_payload))
                    result = response.get_json()
                    payload = retry_payload

                add_log(sim_id, f"Payload updated manually (applied): {json.dumps(result)}")

                with simulator_config_lock:
                    simulator_configs[sim_id]["currentPayload"] = payload
                    simulator_pending_payloads[sim_id] = payload

        add_log(sim_id, "Payload updated manually")
        return {"status": "updated", "id": sim_id}, 200
    except json.JSONDecodeError as e:
        return {"error": "Invalid JSON", "details": str(e)}, 400


def send_payload_once(app, sim_id, payload_str):
    """Send a payload once without running simulator"""
    try:
        payload = _normalize_payload(sim_id, json.loads(payload_str))
        with app.test_client() as client:
            response = client.post("/api/data", json=_simulator_request_payload(payload))
            result = response.get_json()
        
        if sim_id is not None:
            add_log(sim_id, f"Send once: {json.dumps(result)}")
        
        return {"status": "sent", "response": result}, 200
    except Exception as e:
        return {"error": str(e)}, 400


def clear_simulator_responses(sim_id):
    """Clear simulator console output"""
    if sim_id is not None:
        simulator_responses[sim_id] = []
    return {"status": "cleared", "id": sim_id}, 200


def delete_simulator_responses(sim_id):
    """Delete simulator responses when removed"""
    if sim_id is not None and sim_id in simulator_responses:
        del simulator_responses[sim_id]
    return {"status": "deleted", "id": sim_id}, 200
