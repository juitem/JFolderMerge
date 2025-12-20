from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import CompareRequest, ContentRequest, DiffRequest, FileNode, CopyRequest, ListDirRequest
from .comparator import compare_folders
import os
import difflib
import shutil
from fastapi.staticfiles import StaticFiles

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

# Move this to the end to avoid shadowing API
# app.mount("/", StaticFiles(directory="backend/static", html=True), name="static")


@app.post("/api/compare", response_model=FileNode)
def compare(req: CompareRequest):
    if not os.path.exists(req.left_path):
        raise HTTPException(status_code=400, detail="Left path does not exist")
    if not os.path.exists(req.right_path):
        raise HTTPException(status_code=400, detail="Right path does not exist")
    
    try:
        result = compare_folders(
            req.left_path, 
            req.right_path,
            req.exclude_files,
            req.exclude_folders
        )
        return result
    except Exception as e:
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
    left_content = ""
    right_content = ""
    
    if os.path.exists(req.left_path) and os.path.isfile(req.left_path):
        with open(req.left_path, 'r', encoding='utf-8', errors='replace') as f:
            left_content = f.read()
            
    if os.path.exists(req.right_path) and os.path.isfile(req.right_path):
        with open(req.right_path, 'r', encoding='utf-8', errors='replace') as f:
            right_content = f.read()
            
    diff = list(difflib.unified_diff(
        left_content.splitlines(), 
        right_content.splitlines(),
        fromfile='Left',
        tofile='Right',
        lineterm=''
    ))
    
    return {"diff": diff}

@app.post("/api/copy")
def copy_item(req: CopyRequest):
    if not os.path.exists(req.source_path):
        raise HTTPException(status_code=400, detail="Source does not exist")
    
    # Destination parent must exist
    dest_parent = os.path.dirname(req.dest_path)
    if not os.path.exists(dest_parent):
        # Optionally create parent? For now, strict.
        raise HTTPException(status_code=400, detail=f"Destination parent directory does not exist: {dest_parent}")

    try:
        if req.is_dir:
            if os.path.exists(req.dest_path):
                 shutil.rmtree(req.dest_path)
            shutil.copytree(req.source_path, req.dest_path)
        else:
            shutil.copy2(req.source_path, req.dest_path)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/list-dirs")
def list_dirs(req: ListDirRequest):
    path = req.path
    if not path:
        # If empty, try to start from home or root
        path = os.path.expanduser("~")
    
    if not os.path.exists(path) or not os.path.isdir(path):
        raise HTTPException(status_code=400, detail="Invalid directory path")
    
    dirs = []
    try:
        with os.scandir(path) as it:
            for entry in it:
                if entry.is_dir() and not entry.name.startswith('.'):
                    dirs.append(entry.name)
        dirs.sort()
        parent = os.path.dirname(path)
        return {"current": path, "parent": parent, "dirs": dirs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.mount("/", StaticFiles(directory="backend/static", html=True), name="static")
