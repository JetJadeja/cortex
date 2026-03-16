#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Detect local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')

if [ -z "$LOCAL_IP" ]; then
  echo "Could not detect local IP, falling back to localhost"
  LOCAL_IP="localhost"
fi

# Update mobile .env with current IP
MOBILE_ENV="$ROOT_DIR/apps/mobile/.env"
if [ -f "$MOBILE_ENV" ]; then
  sed -i '' "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://${LOCAL_IP}:3000|" "$MOBILE_ENV"
fi

echo "API URL set to http://${LOCAL_IP}:3000"
echo "Starting server in background..."
echo ""

# Start server in background, suppress output
(cd "$ROOT_DIR/server" && bun --watch src/index.ts > /dev/null 2>&1) &
SERVER_PID=$!

echo "Server running (PID $SERVER_PID)"
echo ""

trap "kill $SERVER_PID 2>/dev/null" EXIT

# Start Expo in foreground so QR code is visible
cd "$ROOT_DIR/apps/mobile" && bunx expo start --clear
