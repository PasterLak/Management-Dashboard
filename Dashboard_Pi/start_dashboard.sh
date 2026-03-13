#!/bin/bash
set -euo pipefail
trap 'echo "ERROR: line $LINENO: $BASH_COMMAND" >&2' ERR

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "PineCone Dashboard Setup + Start (Linux)"
cd "$APP_DIR"

CERT_DIR="${1:-/etc/mosquitto/certs}"
CERT_SRC_DIR="${2:-$APP_DIR/keys}"

MOSQUITTO_LISTENERS_CONF="/etc/mosquitto/conf.d/listeners.conf"

# --- We keep the same filenames everywhere (no renaming) ---
CA_FILE="$CERT_DIR/ca.crt"
CERT_FILE="$CERT_DIR/mosquitto.crt"
KEY_FILE="$CERT_DIR/mosquitto.key"

VENV_DIR="$APP_DIR/dashboard"
VENV_PY="$VENV_DIR/bin/python3"
VENV_PIP="$VENV_DIR/bin/pip"
APP_PY="$APP_DIR/app.py"

restart_mosquitto() {
  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q '^mosquitto\.service'; then
    sudo systemctl enable --now mosquitto
    sudo systemctl restart mosquitto
    return 0
  fi
  if command -v service >/dev/null 2>&1; then
    sudo service mosquitto restart
    return 0
  fi
  echo "No service manager found; starting mosquitto manually..."
  sudo pkill -x mosquitto >/dev/null 2>&1 || true
  sudo mosquitto -c /etc/mosquitto/mosquitto.conf -d
}

# --- Basic checks ---
command -v apt-get >/dev/null 2>&1 || { echo "Error: apt-get not found (Debian/Ubuntu only)."; exit 1; }
[[ -f /etc/mosquitto/mosquitto.conf ]] || { echo "Error: /etc/mosquitto/mosquitto.conf not found."; exit 1; }
[[ -f "$APP_PY" ]] || { echo "Error: $APP_PY not found."; exit 1; }

[[ -d "$CERT_SRC_DIR" ]] || { echo "Error: cert source dir not found: $CERT_SRC_DIR"; exit 1; }
for f in "$CERT_SRC_DIR/ca.crt" "$CERT_SRC_DIR/mosquitto.crt" "$CERT_SRC_DIR/mosquitto.key"; do
  [[ -s "$f" ]] || { echo "Error: missing/empty cert file: $f"; exit 1; }
done

# Make sure sudo is ready
sudo -v

echo "Installing required packages..."
sudo apt-get update
sudo apt-get install -y \
  mosquitto mosquitto-clients \
  python3 python3-pip python3-venv \
  openssl iproute2

# --- Ensure Mosquitto conf.d exists and is included ---
sudo mkdir -p /etc/mosquitto/conf.d
if ! grep -qE '^\s*include_dir\s+/etc/mosquitto/conf\.d\s*$' /etc/mosquitto/mosquitto.conf; then
  echo "Adding include_dir /etc/mosquitto/conf.d to /etc/mosquitto/mosquitto.conf"
  echo "" | sudo tee -a /etc/mosquitto/mosquitto.conf >/dev/null
  echo "include_dir /etc/mosquitto/conf.d" | sudo tee -a /etc/mosquitto/mosquitto.conf >/dev/null
fi

# --- Install/copy MQTT TLS certificates if missing ---
need_certs=0
for f in "$CA_FILE" "$CERT_FILE" "$KEY_FILE"; do
  [[ -s "$f" ]] || { need_certs=1; break; }
done

if (( need_certs )); then
  echo "Copying MQTT TLS certificates directly from $CERT_SRC_DIR to $CERT_DIR..."
  sudo mkdir -p "$CERT_DIR"
  sudo cp "$CERT_SRC_DIR/ca.crt" "$CERT_DIR/ca.crt"
  sudo cp "$CERT_SRC_DIR/mosquitto.crt" "$CERT_DIR/mosquitto.crt"
  sudo cp "$CERT_SRC_DIR/mosquitto.key" "$CERT_DIR/mosquitto.key"
else
  echo "TLS certs already exist: $CA_FILE, $CERT_FILE, $KEY_FILE"
fi

# --- Fix permissions for Mosquitto TLS key/certs ---
if [[ "$CERT_DIR" == /etc/* ]]; then
  [[ -f "$KEY_FILE"  ]] && sudo chown mosquitto:mosquitto "$KEY_FILE"  && sudo chmod 600 "$KEY_FILE"
  [[ -f "$CA_FILE"   ]] && sudo chown mosquitto:mosquitto "$CA_FILE"   && sudo chmod 644 "$CA_FILE"
  [[ -f "$CERT_FILE" ]] && sudo chown mosquitto:mosquitto "$CERT_FILE" && sudo chmod 644 "$CERT_FILE"
fi

# --- Write listeners.conf (mTLS on 8883) ---
echo "Writing Mosquitto listeners.conf to $MOSQUITTO_LISTENERS_CONF..."
sudo tee "$MOSQUITTO_LISTENERS_CONF" >/dev/null <<EOF
# Plain MQTT (local only)
listener 1883
allow_anonymous true

# TLS MQTT (local only) with client-certificate required (mTLS)
listener 8883 0.0.0.0
cafile $CA_FILE
certfile $CERT_FILE
keyfile $KEY_FILE

# Require a client certificate signed by cafile:
require_certificate true
use_identity_as_username true

# No username/password (auth is via client certificate)
allow_anonymous true
EOF

echo "Restarting Mosquitto..."
restart_mosquitto

echo "Checking Mosquitto listeners..."
sudo ss -ltnp | grep -E ':(1883|8883)\b' >/dev/null || {
  echo "Error: Mosquitto is not listening on 1883/8883"
  sudo journalctl -u mosquitto -e --no-pager
  exit 1
}

# --- Python venv (create if missing) ---
if [[ ! -x "$VENV_PY" ]]; then
  echo "Creating Python virtual environment at $VENV_DIR..."
  rm -rf "$VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi

echo "Installing Python deps..."
"$VENV_PIP" install --upgrade pip
if [[ -f "$APP_DIR/requirements.txt" ]]; then
  "$VENV_PIP" install -r "$APP_DIR/requirements.txt"
else
  "$VENV_PIP" install flask flask-socketio paho-mqtt
fi

echo "-----------------------------------------"
echo "Dashboard: http://localhost:80"
echo "-----------------------------------------"
echo "Starting Flask dashboard..."
echo "Press CTRL+C to stop."
echo

# Start Flask app (sudo because you may bind to port 80)
exec sudo "$VENV_PY" "$APP_PY"