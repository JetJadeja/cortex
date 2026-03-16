#!/bin/bash

# Detect local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')

if [ -z "$LOCAL_IP" ]; then
  echo "Could not detect local IP, falling back to localhost"
  LOCAL_IP="localhost"
fi

# Update mobile .env with current IP
MOBILE_ENV="apps/mobile/.env"
if [ -f "$MOBILE_ENV" ]; then
  sed -i '' "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://${LOCAL_IP}:3000|" "$MOBILE_ENV"
fi

echo "API URL set to http://${LOCAL_IP}:3000"
echo ""

# Start server and mobile app concurrently
bun run server &
SERVER_PID=$!

bun run mobile &
MOBILE_PID=$!

trap "kill $SERVER_PID $MOBILE_PID 2>/dev/null" EXIT

wait
