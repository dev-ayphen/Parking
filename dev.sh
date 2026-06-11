#!/bin/bash

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti tcp:$port 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "→ Killing process on port $port (PID: $pids)..."
    echo "$pids" | xargs kill -9 2>/dev/null
    # Wait until port is actually free
    for i in $(seq 1 10); do
      sleep 0.3
      lsof -ti tcp:$port 2>/dev/null && continue || break
    done
    echo "  Port $port freed ✓"
  else
    echo "→ Port $port already free ✓"
  fi
}

kill_port 3000
kill_port 3001

echo "→ Resetting watchman..."
watchman watch-del '/Users/hariharanshanmugasundaram/Desktop/parking' 2>/dev/null || true
watchman watch-project '/Users/hariharanshanmugasundaram/Desktop/parking' 2>/dev/null || true
echo "  Watchman reset ✓"

echo ""
echo "→ Starting API (3000) + Web Admin (3001) + Mobile (Expo)..."
echo ""

exec npx concurrently \
  --names "API,WEB,MOBILE" \
  --prefix-colors "blue,green,magenta" \
  "pnpm --filter api dev" \
  "pnpm --filter web exec next dev -p 3001" \
  "pnpm --filter mobile start"
