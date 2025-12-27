#!/bin/bash


# Get the directory of the script to ensure we run from the correct location
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Default values
DEFAULT_PORT=8000
DEFAULT_LEFT="/Users/juitem/Docker/ContainerFolder/FolderComp"
[[ ! -d $DEFAULT_LEFT ]] && DEFAULT_LEFT="$DIR/test/A"
DEFAULT_RIGHT="/Users/juitem/Docker/ContainerFolder/JF"
[[ ! -d $DEFAULT_RIGHT ]] && DEFAULT_RIGHT="$DIR/test/B"
# Argument parsing logic
# usage: ./run.sh [LEFT] [RIGHT] [PORT]
if [ "$#" -eq 1 ]; then
    if [[ "$1" =~ ^[0-9]+$ ]]; then
        PORT=$1
        LEFT=$DEFAULT_LEFT
        RIGHT=$DEFAULT_RIGHT
    else
        # Arg provided but not a number? treat as custom logic or error?
        # User might try ./run.sh path/to/left
        echo "Usage: ./run.sh [PORT] OR ./run.sh [LEFT] [RIGHT] [PORT]"
        exit 1
    fi
elif [ "$#" -ge 2 ]; then
    # Handle empty strings using default expansion
    L_ARG=${1:-$DEFAULT_LEFT}
    R_ARG=${2:-$DEFAULT_RIGHT}
    
    # Resolve absolute paths using Python for better compatibility on macOS/Linux
    LEFT=$(python3 -c "import os; print(os.path.abspath('$L_ARG'))")
    RIGHT=$(python3 -c "import os; print(os.path.abspath('$R_ARG'))")
    
    PORT=${3:-$DEFAULT_PORT}
else
    LEFT=$(python3 -c "import os; print(os.path.abspath('$DEFAULT_LEFT'))")
    RIGHT=$(python3 -c "import os; print(os.path.abspath('$DEFAULT_RIGHT'))")
    PORT=$DEFAULT_PORT
fi

# Export removed. We pass args directly to Python now.

# DIR calculation moved to top.

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Setting it up..."
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
fi

# Run the application
echo "=================================================="
# Try to detect local IP for display
IP=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    IP=$(ipconfig getifaddr en0 2>/dev/null) # macOS
else
    IP=$(hostname -I 2>/dev/null | awk '{print $1}') # Linux
fi
if [ -z "$IP" ]; then
     # Fallback generic
     IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -n 1 | awk '{print $2}')
fi

echo "Starting Folder Comparison Tool"
echo "URL (Local):    http://localhost:$PORT"
if [ ! -z "$IP" ]; then
    echo "URL (External): http://$IP:$PORT"
fi
# echo "URL (Listen):   http://0.0.0.0:$PORT" # Optional, maybe confusing if not clickable
echo "Left Path:  $LEFT"
echo "Right Path: $RIGHT"
echo "Press CTRL+C to stop"
echo "=================================================="

# Check if the port is already in use
PIDS=$(lsof -ti:$PORT)
if [ ! -z "$PIDS" ]; then
    for PID in $PIDS; do
        # Get the process info using simple ps (avoids flag issues)
        PROC_INFO=$(ps -ww -p $PID)
        
        # Check if the info matches our application (uvicorn or its children)
        # Updated to match 'python -m backend.main' style
        if [[ "$PROC_INFO" == *"uvicorn backend.main:app"* ]] || [[ "$PROC_INFO" == *"multiprocessing.spawn"* ]] || [[ "$PROC_INFO" == *"backend.main"* ]]; then
            echo "Port $PORT is currently in use by this application (PID $PID). Killing it..."
            kill -9 $PID
        else
            echo "WARNING: Port $PORT is in use by a different process (PID $PID)."
            echo "Process Info: $PROC_INFO"
            echo "Refusing to kill automatically. Please stop it manually or use a different port."
            exit 1
        fi
    done
    
    # Wait until all are gone
    while lsof -ti:$PORT >/dev/null; do
        sleep 0.1
    done
    sleep 0.5
fi

# Cleanup function to ensure port is released
cleanup() {
    echo ""
    echo "Stopping application..."
    if [ ! -z "$APP_PID" ]; then
        kill $APP_PID 2>/dev/null
    fi
    exit
}

# Trap signals
trap cleanup SIGINT SIGTERM EXIT

# Use the venv python to run the main module directly
# Passing arguments explicitly to Python as requested
./venv/bin/python3 -m backend.main --left "$LEFT" --right "$RIGHT" --port "$PORT" &
APP_PID=$!
wait $APP_PID
