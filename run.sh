#!/bin/bash

# Default port is 8000 if not provided as the first argument
PORT=${1:-8000}

# Get the directory of the script to ensure we run from the correct location
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the project directory
cd "$DIR"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Setting it up..."
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
fi

# Run the application
echo "=================================================="
echo "Starting Folder Comparison Tool"
echo "URL: http://localhost:$PORT"
echo "Press CTRL+C to stop"
echo "=================================================="

# Use the venv python to run uvicorn module
./venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT --reload
