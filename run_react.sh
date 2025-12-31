#!/bin/bash

# Get the directory of the script to ensure we run from the correct location
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Setting it up..."
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
fi

# Argument parsing logic
# usage: ./run_react.sh [LEFT] [RIGHT] [PORT]
DEFAULT_PORT=8000
PORT=$DEFAULT_PORT
EXTRA_ARGS=""

if [ "$#" -eq 1 ]; then
    if [[ "$1" =~ ^[0-9]+$ ]]; then
        PORT=$1
    else
        # Only one arg provided and not a number? Assume it's the left path.
        LEFT_ABS=$(./venv/bin/python3 -c "import os; import sys; print(os.path.abspath(sys.argv[1]))" "$1")
        EXTRA_ARGS="--left $LEFT_ABS"
    fi
elif [ "$#" -ge 2 ]; then
    LEFT_ABS=$(./venv/bin/python3 -c "import os; import sys; print(os.path.abspath(sys.argv[1]))" "$1")
    RIGHT_ABS=$(./venv/bin/python3 -c "import os; import sys; print(os.path.abspath(sys.argv[1]))" "$2")
    PORT=${3:-$DEFAULT_PORT}
    EXTRA_ARGS="--left $LEFT_ABS --right $RIGHT_ABS"
fi

# Start Backend
echo "[RunReact] Starting Backend on http://localhost:$PORT..."
if [ -n "$EXTRA_ARGS" ]; then
    echo "[RunReact] Using explicit CLI paths: $EXTRA_ARGS"
else
    echo "[RunReact] No paths provided, using saved configuration or defaults."
fi

# Pass the resolved paths to the backend only if they exist
./venv/bin/python3 -m backend.main $EXTRA_ARGS --port "$PORT" &
BACKEND_PID=$!

# Function to handle cleanup
cleanup() {
    echo ""
    echo "[RunReact] Stopping processes..."
    kill $BACKEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM EXIT

# Wait a moment for backend to init
sleep 2

# Start Frontend
echo "[RunReact] Starting Frontend..."
echo "[RunReact] Access the App at http://localhost:5173"

cd frontend-react
# Check for node_modules and install if missing
if [ ! -d "node_modules" ]; then
    echo "[RunReact] Installing frontend dependencies..."
    npm install
fi

npm run dev
