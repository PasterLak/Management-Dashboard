"""
Configuration settings for the PineCone Management Dashboard
"""
from pathlib import Path

# Data storage
DATA_DIR = Path("data")
DATA_DIR.mkdir(parents=True, exist_ok=True)
DEVICES_JSON = DATA_DIR / "devices.json"

# Console logging
MAX_CONSOLE_LOGS = 150
DEFAULT_MAX_SIMULATOR_RESPONSES = 100

# Server settings
HOST = "0.0.0.0"
PORT = 80
DEBUG = False
