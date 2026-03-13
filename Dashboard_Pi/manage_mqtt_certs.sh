#!/bin/bash
set -euo pipefail

CERT_DIR="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DEFAULT_SRC="$SCRIPT_DIR/mqtt_certs"
SRC_DIR="${2:-$DEFAULT_SRC}"
if [[ ! -d "$SRC_DIR" ]]; then
  SRC_DIR="$SCRIPT_DIR"
fi

if [[ -z "$CERT_DIR" ]]; then
  echo "Usage: $0 <target-cert-dir> [source-dir]"
  echo "Example: $0 /etc/mosquitto/certs $SCRIPT_DIR/mqtt_certs"
  exit 1
fi

CA_SRC="$SRC_DIR/ca.crt"
CERT_SRC="$SRC_DIR/mosquitto.crt"
KEY_SRC="$SRC_DIR/mosquitto.key"

# Keep the same filenames in target dir
CA_DST="$CERT_DIR/ca.crt"
CERT_DST="$CERT_DIR/mosquitto.crt"
KEY_DST="$CERT_DIR/mosquitto.key"

for f in "$CA_SRC" "$CERT_SRC" "$KEY_SRC"; do
  [[ -s "$f" ]] || { echo "Error: missing or empty file: $f"; exit 1; }
done

mkdir -p "$CERT_DIR"

install -m 0644 "$CA_SRC"   "$CA_DST"
install -m 0644 "$CERT_SRC" "$CERT_DST"
install -m 0600 "$KEY_SRC"  "$KEY_DST"

# Validate parse
openssl x509 -in "$CA_DST"   -noout >/dev/null
openssl x509 -in "$CERT_DST" -noout >/dev/null
openssl pkey -in "$KEY_DST"  -noout >/dev/null

# Verify cert matches key
cert_md5="$(openssl x509 -in "$CERT_DST" -noout -modulus | openssl md5)"
key_md5="$(openssl pkey -in "$KEY_DST" -noout -modulus | openssl md5)"
if [[ "$cert_md5" != "$key_md5" ]]; then
  echo "ERROR: mosquitto.crt and mosquitto.key do not match!"
  exit 1
fi

# SAN warning (optional)
if ! openssl x509 -in "$CERT_DST" -noout -text | grep -q "Subject Alternative Name"; then
  echo "WARNING: certificate has no SAN (Subject Alternative Name)."
  echo "         If clients do hostname/IP verification, they may fail unless tls_insecure_set(True) is used."
fi

echo "Installed MQTT TLS files:"
ls -l "$CERT_DIR"