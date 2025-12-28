from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import argparse
from .global_state import GlobalState
from .routers import comparison, files, system

# Parse arguments
parser = argparse.ArgumentParser(description="Folder Comparison Tool")
parser.add_argument("--left", default=None, help="Left folder path")
parser.add_argument("--right", default=None, help="Right folder path")
parser.add_argument("--port", type=int, default=8000, help="Port to run on")
parser.add_argument("--host", default="127.0.0.1", help="Host to bind to (default: localhost)")

# Parse known args
args, _ = parser.parse_known_args()

# Initialize Global State
GlobalState.args = args

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_full_url(request: Request, call_next):
    print(f"INFO:     Request URL: {request.url}")
    response = await call_next(request)
    return response

# Include Routers
app.include_router(comparison.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(system.router, prefix="/api")

# Mount Static Files (Frontend)
app.mount("/", StaticFiles(directory="frontend", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host=args.host, port=args.port, reload=True)
