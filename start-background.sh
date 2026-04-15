#!/bin/bash
# start-background.sh — JFolderMerge 백그라운드 실행 (HomeServiceDashboard 트리거용)

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

BACKEND_PORT=8084
FRONTEND_PORT=1774
LOG_DIR="$DIR/logs"
BACKEND_PID_FILE="$DIR/.backend.pid"
FRONTEND_PID_FILE="$DIR/.frontend.pid"

mkdir -p "$LOG_DIR"

# 이미 실행 중인지 확인
BACKEND_RUNNING=false
FRONTEND_RUNNING=false
lsof -ti ":$BACKEND_PORT" > /dev/null 2>&1 && BACKEND_RUNNING=true
lsof -ti ":$FRONTEND_PORT" > /dev/null 2>&1 && FRONTEND_RUNNING=true

if $BACKEND_RUNNING && $FRONTEND_RUNNING; then
  echo "JFolderMerge is already running (ports $BACKEND_PORT, $FRONTEND_PORT)"
  exit 0
fi

if $BACKEND_RUNNING || $FRONTEND_RUNNING; then
  echo "JFolderMerge partially running — cleaning up before restart..."
  { lsof -ti ":$BACKEND_PORT"; lsof -ti ":$FRONTEND_PORT"; } | sort -u | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# venv 없으면 생성
if [ ! -d "$DIR/venv" ]; then
  echo "Creating virtualenv..."
  python3 -m venv "$DIR/venv"
  "$DIR/venv/bin/pip" install -r "$DIR/requirements.txt" -q
fi

# 백엔드 시작
source "$DIR/venv/bin/activate"
nohup python3 -m backend.main --port "$BACKEND_PORT" > "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$BACKEND_PID_FILE"

# 프론트엔드 시작
cd "$DIR/frontend-react"
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install -q
fi
nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$FRONTEND_PID_FILE"

echo "JFolderMerge launched in background"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "  Backend:  http://localhost:$BACKEND_PORT"
