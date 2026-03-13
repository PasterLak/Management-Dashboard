#!/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$APP_DIR/.." && pwd)"
GAME_SERVER_DIR="$PROJECT_ROOT/game_server"
VENV="$APP_DIR/dashboard/bin/python3"

if [[ ! -d "$GAME_SERVER_DIR" ]]; then
  echo "Error: $GAME_SERVER_DIR not found."
  exit 1
fi
if [[ ! -x "$VENV" ]]; then
  echo "Error: Python venv not found at $VENV."
  exit 1
fi
cd "$GAME_SERVER_DIR"
exec "$VENV" app.py
