import json
from config import DEVICES_JSON

# In-memory device storage
devices = {}


def _normalize_pins_from_storage(pins):
    if not isinstance(pins, dict):
        return {}

    normalized = {}
    for gpio, pin_data in pins.items():
        if not isinstance(pin_data, dict):
            continue

        normalized[gpio] = {
            "n": pin_data.get("n", pin_data.get("name", "")),
            "m": pin_data.get("m", pin_data.get("mode", "")),
            "v": pin_data.get("v", pin_data.get("value", "")),
        }

    return normalized


def _normalize_device_from_storage(device):
    if not isinstance(device, dict):
        device = {}

    normalized = {
        "description": str(device.get("description", device.get("d", "")) or ""),
        "ip": str(device.get("ip", "") or ""),
        "last_seen": str(device.get("last_seen", device.get("ls", "")) or ""),
        "pins": _normalize_pins_from_storage(device.get("pins", device.get("p", {}))),
        "blink": bool(device.get("blink", device.get("b", False))),
    }

    if device.get("is_simulator") is True or device.get("sim") is True:
        normalized["is_simulator"] = True

    return normalized


def _serialize_pins_for_storage(pins):
    if not isinstance(pins, dict):
        return {}

    serialized = {}
    for gpio, pin_data in pins.items():
        if not isinstance(pin_data, dict):
            continue

        serialized[gpio] = {
            "n": pin_data.get("n", pin_data.get("name", "")),
            "m": pin_data.get("m", pin_data.get("mode", "")),
            "v": pin_data.get("v", pin_data.get("value", "")),
        }

    return serialized


def _serialize_device_for_storage(device):
    if not isinstance(device, dict):
        device = {}

    serialized = {
        "ip": str(device.get("ip", "") or ""),
        "d": str(device.get("description", device.get("d", "")) or ""),
        "ls": str(device.get("last_seen", device.get("ls", "")) or ""),
        "p": _serialize_pins_for_storage(device.get("pins", device.get("p", {}))),
    }

    if bool(device.get("blink", device.get("b", False))):
        serialized["b"] = True

    if device.get("is_simulator") is True or device.get("sim") is True:
        serialized["sim"] = True

    return serialized


def load_devices():
    if not DEVICES_JSON.is_file():
        return {}
    
    try:
        with DEVICES_JSON.open("r", encoding="utf-8") as f:
            data = json.load(f)

        return {
            node_id: _normalize_device_from_storage(device)
            for node_id, device in data.items()
        }
    except Exception as e:
        print(f"Error loading devices: {e}")
        return {}


def save_devices():
    try:
        with DEVICES_JSON.open("w", encoding="utf-8") as f:
            json.dump(
                {
                    node_id: _serialize_device_for_storage(device)
                    for node_id, device in devices.items()
                },
                f,
                ensure_ascii=False,
                indent=2,
            )
    except Exception as e:
        print(f"Error saving devices: {e}")


def get_device(node_id):
    return devices.get(node_id)


def update_device(node_id, data):
    clean = _normalize_device_from_storage(data)
    devices[node_id] = clean
    save_devices()


def delete_device(node_id):
    if node_id in devices:
        del devices[node_id]
        save_devices()
        return True
    return False


def get_all_devices():
    return devices


devices.update(load_devices())
