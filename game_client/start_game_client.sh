#!/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$APP_DIR/.." && pwd)"
GAME_DIR="$PROJECT_ROOT/game_client"

if [[ ! -d "$GAME_DIR" ]]; then
  echo "Error: $GAME_DIR not found."
  exit 1
fi
cd "$GAME_DIR"
exec python3 -m http.server 8081
