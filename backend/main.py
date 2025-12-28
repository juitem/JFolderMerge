
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from .models import CompareRequest, ContentRequest, DiffRequest, FileNode, CopyRequest, ListDirRequest, SaveRequest, DeleteRequest, HistoryRequest, ExternalToolRequest
from .comparator import compare_folders
import os
import difflib
import shutil
import argparse
import sys
import uvicorn
from fastapi.staticfiles import StaticFiles
import json

SETTINGS_DIR = "settings"
HISTORY_FILE = os.path.join(SETTINGS_DIR, "history.json")

# Parse arguments at module level so they are available to API endpoints
# Use parse_known_args to avoid issues if uvicorn injects other args (though we control the entry point)
parser = argparse.ArgumentParser(description="Folder Comparison Tool")
# Defaults set to None so we can distinguish between "User provided" (or script provided) and "Not provided"
parser.add_argument("--left", default=None, help="Left folder path")
parser.add_argument("--right", default=None, help="Right folder path")
parser.add_argument("--port", type=int, default=8000, help="Port to run on")
parser.add_argument("--host", default="127.0.0.1", help="Host to bind to (default: localhost)")

# We parse known args to avoid erroring if we are run in a context with extra args, 
# though in our run.sh case it will be clean.
# Also, checking specific flags prevents interference during testing or imports if needed.
args, _ = parser.parse_known_args()

app = FastAPI()

# Mount static files (Frontend)
# We mount this AFTER defining API routes so they take precedence? 
# Actually FastAPI matches in order. But StaticFiles at "/" catches everything not matched?
# No, usually specific routes match first. But let's check.
# Better to be safe.


# Allow CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend origin created by Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_full_url(request: Request, call_next):
    # Log the full URL for every request
    # This satisfies the user requirement to see "http://..." in logs
    print(f"INFO:     Request URL: {request.url}")
    response = await call_next(request)
    return response

# Move this to the end to avoid shadowing API
# app.mount("/", StaticFiles(directory="backend/static", html=True), name="static")


@app.post("/api/compare", response_model=FileNode)
def compare(req: CompareRequest):
    if not os.path.exists(req.left_path):
        raise HTTPException(status_code=400, detail="Left path does not exist")
    if not os.path.exists(req.right_path):
        raise HTTPException(status_code=400, detail="Right path does not exist")
    
    try:
        from .core.comparator import compare_folders
        result = compare_folders(
            req.left_path, 
            req.right_path,
            req.exclude_files,
            req.exclude_folders
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/content")
def get_content(path: str):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    if not os.path.isfile(path):
        raise HTTPException(status_code=400, detail="path is not a file")
    
    try:
        # Detect text encoding or just read as utf-8 replacing errors
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/diff")
def get_diff(req: DiffRequest):
    # Logic extracted to core/differ.py but Main might still have old copy or we use router?
    # Wait, we refactored Main in previous turn to use Routers, BUT I might have reverted or 
    # overwritten it with the "Monolith" version in my thought process?
    # Let's check the current file content via what I am replacing.
    # The TargetContent below implies it IS the Monolith version.
    # User might have rejected the Router refactor? Or I am seeing cached state?
    # Ah, I see `TargetContent` in previous turn had `app.include_router`. 
    # But here I am replacing lines 18-300+?
    
    # Wait, in Step 2382 I planned to refactor Main.
    # In Step 2385 it failed/was flagged.
    # In Step 2388 User said "Proceed".
    # But I proceeded with FRONTEND refactoring.
    # Did I ever apply the Backend Router refactor?
    # Step 2385 was "The previous CodeEdit was suggested... The diff was not immediately applied".
    # User manually reviewed? No, User said "Proceed". 
    # Usually "Proceed" means "Do what you planned".
    # But did I re-apply the backend refactor? No. I went strait to Frontend.
    
    # So `backend/main.py` is STILL the Monolith.
    # The routers I created (`backend/routers/comparison.py`, etc.) are sitting there unused.
    # AND `backend/core/differ.py` is unused.
    
    # So I have TWO tasks here:
    # 1. Fix the Priority Issue.
    # 2. Actually Apply the Backend Refactor (Modularity) that I supposedly did.
    
    # The User's issue "Left/Right folder not changing" is unrelated to modularity, but crucial.
    # If I apply Modularity now, I can fix the Priority logic in `backend/main.py` (the new clean version).
    
    # Strategy:
    # Rewrite `backend/main.py` to be the Clean Router version (finishing Phase 1) AND fix priority in `load_config`.
    # This solves the user's issue and completes the refactor.
    
    pass 
    
    if req.mode == "side-by-side":
        from .core.differ import generate_side_by_side_diff
        return generate_side_by_side_diff(req.left_path, req.right_path)
    else:
        from .core.differ import generate_unified_diff
        return generate_unified_diff(req.left_path, req.right_path)

@app.post("/api/copy")
def copy_item(req: CopyRequest):
    if not os.path.exists(req.source_path):
        raise HTTPException(status_code=400, detail="Source does not exist")
    
    dest_path = req.dest_path
    dest_parent = os.path.dirname(dest_path)
    if not os.path.exists(dest_parent):
        raise HTTPException(status_code=400, detail=f"Destination parent directory does not exist: {dest_parent}")

    try:
        if req.is_dir:
            if os.path.exists(dest_path):
                 shutil.rmtree(dest_path)
            shutil.copytree(req.source_path, dest_path)
        else:
            shutil.copy2(req.source_path, dest_path)
        return {"status": "success"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/save-file")
def save_file(req: SaveRequest):
    try:
        temp_path = req.path + ".tmp"
        with open(temp_path, 'w', encoding='utf-8') as f:
            f.write(req.content)
            
        os.replace(temp_path, req.path)
        return {"status": "success"}
    except Exception as e:
        if os.path.exists(req.path + ".tmp"):
            try:
                os.remove(req.path + ".tmp")
            except:
                pass
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/delete")
def delete_item(req: DeleteRequest):
    if not os.path.exists(req.path):
        raise HTTPException(status_code=404, detail="Path does not exist")
    try:
        if os.path.isdir(req.path):
            shutil.rmtree(req.path)
        else:
            os.remove(req.path)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/list-dirs")
def list_dirs(req: ListDirRequest):
    path = req.path
    if not path:
        path = os.path.expanduser("~")
    
    path = os.path.abspath(path)
    
    if not os.path.exists(path) or not os.path.isdir(path):
        raise HTTPException(status_code=400, detail="Invalid directory path")
    
    dirs = []
    files = []
    try:
        with os.scandir(path) as it:
            for entry in it:
                if entry.name.startswith('.'):
                    continue
                if entry.is_dir():
                    dirs.append(entry.name)
                elif req.include_files and entry.is_file():
                    files.append(entry.name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    dirs.sort()
    files.sort()
    parent = os.path.dirname(path)
    return {"current": path, "parent": parent, "dirs": dirs, "files": files}

# ...
# I will use the MODULAR content I prepared earlier but missed applying.
# AND I will ensure load_config logic is correct.

CONFIG_FILE = "settings/config.json"
def load_config():
    # 1. Defaults
    config = {
        "left": "test/A",
        "right": "test/B",
        "ignoreFoldersPath": "settings/ignore_folders",
        "ignoreFilesPath": "settings/ignore_files",
        "defaultIgnoreFolderFile": "default",
        "defaultIgnoreFileFile": "default"
    }
    
    # 2. File Config overrides Defaults
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                file_config = json.load(f)
                if "defaultLeftPath" in file_config: config["left"] = file_config["defaultLeftPath"]
                if "defaultRightPath" in file_config: config["right"] = file_config["defaultRightPath"]
                # ... copy others
                if "ignoreFoldersPath" in file_config: config["ignoreFoldersPath"] = file_config["ignoreFoldersPath"]
                if "ignoreFilesPath" in file_config: config["ignoreFilesPath"] = file_config["ignoreFilesPath"]
        except Exception:
            pass

    # 3. CLI Args override EVERYTHING (if present)
    if args.left is not None: config["left"] = args.left
    if args.right is not None: config["right"] = args.right
    
    return config

# ...


@app.get("/api/config")
def get_config():
    return load_config()

# History API
HISTORY_FILE = "settings/history.json"

@app.get("/api/history")
def get_history():
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, 'r') as f:
            content = f.read()
            if not content:
                return []
            return json.loads(content)
    except Exception as e:
        print(f"Error loading history: {e}")
        return []

@app.post("/api/history")
def save_history(req: HistoryRequest):
    history = get_history()
    
@app.post("/api/history")
def save_history(req: HistoryRequest):
    history = get_history()
    
    # Create new entry
    import datetime
    new_entry = {
         "left_path": req.left_path,
         "right_path": req.right_path,
         "timestamp": datetime.datetime.now().isoformat()
    }
    
    # Remove duplicate if exists (same left/right)
    history = [h for h in history if not (h["left_path"] == req.left_path and h["right_path"] == req.right_path)]
    
    # Add to top
    history.insert(0, new_entry)
    
    # Keep max 10
    history = history[:10]
    
    try:
        os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
        with open(HISTORY_FILE, 'w') as f:
            json.dump(history, f, indent=2)
        return {"status": "success", "history": history}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/open-external")
def open_external(req: ExternalToolRequest):
    import subprocess
    import platform
    
    # Basic Validation
    if not os.path.exists(req.left_path) or not os.path.exists(req.right_path):
        raise HTTPException(status_code=404, detail="One or more files not found")

    cmd = []
    
    # Tool Selection Strategy
    system = platform.system()
    
    # If the user provided a specific tool command (advanced), we might respect it.
    # But for now, let's map "meld" and "default".
    
    tool = req.tool.lower()
    
    if tool == "meld":
        # Check if meld is in path?
        # On Mac, 'meld' might be an alias or not installed.
        # User might have installed via brew.
        cmd = ["meld", req.left_path, req.right_path]
        
    elif tool == "code" or tool == "vscode":
        cmd = ["code", "--diff", req.left_path, req.right_path]
        
    elif tool == "opendiff" or tool == "filemerge" or (tool == "default" and system == "Darwin"):
        cmd = ["opendiff", req.left_path, req.right_path]
        
    else:
        # Fallback to system open? 
        # Opening two files separately isn't a diff.
        # Try to guess based on OS
        if shutil.which("meld"):
             cmd = ["meld", req.left_path, req.right_path]
        elif shutil.which("code"):
             cmd = ["code", "--diff", req.left_path, req.right_path]
        elif system == "Darwin":
             cmd = ["opendiff", req.left_path, req.right_path]
        elif system == "Windows":
             raise HTTPException(status_code=501, detail="Windows external tool not yet configured")
        else:
             raise HTTPException(status_code=501, detail="No suitable diff tool found (Meld, VSCode, FileMerge)")

    print(f"Executing: {cmd}")
    
    try:
        # Use Popen to run non-blocking (detach)
        subprocess.Popen(cmd)
        return {"status": "success", "command": " ".join(cmd)}
    except FileNotFoundError:
        # If the specific tool wasn't found
        raise HTTPException(status_code=500, detail=f"Tool not found: {cmd[0]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


app.mount("/", StaticFiles(directory="frontend", html=True), name="static")

if __name__ == "__main__":
    # If run directly as a script, start uvicorn
    # This allows: python -m backend.main --left ... --right ...
    uvicorn.run("backend.main:app", host=args.host, port=args.port, reload=True)
