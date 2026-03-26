#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_ENV="$ROOT_DIR/apps/mobile/.env"
TUNNEL=false

if [ "$1" = "--tunnel" ]; then
  TUNNEL=true
fi

# Detect local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$LOCAL_IP" ]; then
  echo "Could not detect local IP, falling back to localhost"
  LOCAL_IP="localhost"
fi

# Start server in background, log to file
SERVER_LOG="$ROOT_DIR/server.log"
: > "$SERVER_LOG"
(cd "$ROOT_DIR/server" && bun --watch src/index.ts >> "$SERVER_LOG" 2>&1) &
SERVER_PID=$!

PIDS_TO_KILL="$SERVER_PID"

cleanup() {
  for pid in $PIDS_TO_KILL; do
    kill "$pid" 2>/dev/null
  done
  rm -f "${NGROK_LOG:-}"
}
trap cleanup EXIT

echo "Server running (PID $SERVER_PID)"
echo "Server logs: tail -f server.log"

if [ "$TUNNEL" = true ]; then
  # Tunnel the Express server via ngrok (inspect disabled to avoid port conflict with Expo)
  NGROK_TOKEN=$(grep authtoken "$HOME/.ngrok2/ngrok.yml" 2>/dev/null | cut -d' ' -f2)
  NGROK_LOG=$(mktemp /tmp/cortex-ngrok-log.XXXXXX)
  /opt/homebrew/bin/ngrok http 3000 \
    --authtoken "$NGROK_TOKEN" \
    --inspect=false \
    --log "$NGROK_LOG" \
    --log-format json &
  NGROK_PID=$!
  PIDS_TO_KILL="$PIDS_TO_KILL $NGROK_PID"

  echo "Waiting for server tunnel..."
  TUNNEL_URL=""
  for i in $(seq 1 20); do
    TUNNEL_URL=$(grep -o '"url":"https://[^"]*"' "$NGROK_LOG" 2>/dev/null \
      | head -1 \
      | cut -d'"' -f4)
    if [ -n "$TUNNEL_URL" ]; then
      break
    fi
    sleep 0.5
  done

  if [ -z "$TUNNEL_URL" ]; then
    echo "Failed to start server tunnel. Falling back to LAN."
    kill "$NGROK_PID" 2>/dev/null
    API_URL="http://${LOCAL_IP}:3000"
  else
    API_URL="$TUNNEL_URL"
  fi
else
  API_URL="http://${LOCAL_IP}:3000"
fi

# Write API URL to mobile .env
if [ -f "$MOBILE_ENV" ]; then
  sed -i '' "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=${API_URL}|" "$MOBILE_ENV"
fi

echo "API URL: $API_URL"
echo ""

# Start Expo in foreground
EXPO_ARGS="--clear"
if [ "$TUNNEL" = true ]; then
  EXPO_ARGS="$EXPO_ARGS --tunnel"
fi
cd "$ROOT_DIR/apps/mobile" && bunx expo start --clear $EXPO_ARGS
