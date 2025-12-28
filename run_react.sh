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

# Argument parsing logic (Matches run.sh style)
# usage: ./run_react.sh [LEFT] [RIGHT] [PORT]
DEFAULT_PORT=8000
DEFAULT_LEFT="/Users/juitem/Docker/ContainerFolder/JF"
DEFAULT_RIGHT="/Users/juitem/Docker/ContainerFolder/FolderComp"

# Fallback to test dirs if defaults don't exist
[[ ! -d $DEFAULT_LEFT ]] && DEFAULT_LEFT="$DIR/test/A"
[[ ! -d $DEFAULT_RIGHT ]] && DEFAULT_RIGHT="$DIR/test/B"

# Ensure test dirs exist if defaults become test dirs
[[ ! -d "test/A" ]] && mkdir -p test/A
[[ ! -d "test/B" ]] && mkdir -p test/B

if [ "$#" -eq 1 ]; then
    if [[ "$1" =~ ^[0-9]+$ ]]; then
        PORT=$1
        LEFT=$DEFAULT_LEFT
        RIGHT=$DEFAULT_RIGHT
    else
        # Arg provided but not a number? Assume it's a path, but we need 2 paths usually.
        # Fallback to defaults for others?
        LEFT=$1
        RIGHT=$DEFAULT_RIGHT
        PORT=$DEFAULT_PORT
    fi
elif [ "$#" -ge 2 ]; then
    LEFT=${1:-$DEFAULT_LEFT}
    RIGHT=${2:-$DEFAULT_RIGHT}
    PORT=${3:-$DEFAULT_PORT}
else
    LEFT=$DEFAULT_LEFT
    RIGHT=$DEFAULT_RIGHT
    PORT=$DEFAULT_PORT
fi

# Resolve absolute paths using Python for better compatibility
LEFT_ABS=$(./venv/bin/python3 -c "import os; print(os.path.abspath('$LEFT'))")
RIGHT_ABS=$(./venv/bin/python3 -c "import os; print(os.path.abspath('$RIGHT'))")

# Start Backend
echo "[RunReact] Starting Backend on http://localhost:$PORT..."
echo "[RunReact] Comparing:"
echo "  Left:  $LEFT_ABS"
echo "  Right: $RIGHT_ABS"

# Pass the resolved paths to the backend
./venv/bin/python3 -m backend.main --left "$LEFT_ABS" --right "$RIGHT_ABS" --port "$PORT" &
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
npm run dev
