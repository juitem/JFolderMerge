
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from .models import CompareRequest, ContentRequest, DiffRequest, FileNode, CopyRequest, ListDirRequest, SaveRequest
from .comparator import compare_folders
import os
import difflib
import shutil
import argparse
import sys
import uvicorn
from fastapi.staticfiles import StaticFiles

# Parse arguments at module level so they are available to API endpoints
# Use parse_known_args to avoid issues if uvicorn injects other args (though we control the entry point)
parser = argparse.ArgumentParser(description="Folder Comparison Tool")
parser.add_argument("--left", default="test/A", help="Left folder path")
parser.add_argument("--right", default="test/B", help="Right folder path")
parser.add_argument("--port", type=int, default=8000, help="Port to run on")

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
            
    if req.mode == "side-by-side":
        left_lines = left_content.splitlines()
        right_lines = right_content.splitlines()
        
        diff_gen = difflib.ndiff(left_lines, right_lines)
        
        left_rows = []
        right_rows = []
        
        # Logic to process diff and align changes
        # We buffer consecutive removals and additions to align them on the same 'modified' row
        
        removes_buffer = []
        adds_buffer = []
        
        from difflib import SequenceMatcher

        def compute_line_diff(a, b):
            """Returns (left_segments, right_segments) for word-level highlighting"""
            sm = SequenceMatcher(None, a, b)
            left_segs = []
            right_segs = []
            
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag == 'equal':
                    seg_text = a[i1:i2]
                    left_segs.append({"text": seg_text, "type": "same"})
                    right_segs.append({"text": seg_text, "type": "same"})
                elif tag == 'replace':
                    left_segs.append({"text": a[i1:i2], "type": "removed"})
                    right_segs.append({"text": b[j1:j2], "type": "added"})
                elif tag == 'delete':
                    left_segs.append({"text": a[i1:i2], "type": "removed"})
                elif tag == 'insert':
                    right_segs.append({"text": b[j1:j2], "type": "added"})
                    
            return left_segs, right_segs

        def flush_buffers():
            nonlocal removes_buffer, adds_buffer
            common_len = min(len(removes_buffer), len(adds_buffer))
            
            # 1. Aligned "Modified" lines
            for i in range(common_len):
                l_obj = removes_buffer[i]
                r_obj = adds_buffer[i]
                
                l_text = l_obj["text"]
                r_text = r_obj["text"]
                
                # Compute sub-diff
                l_segs, r_segs = compute_line_diff(l_text, r_text)
                
                left_rows.append({"text": l_segs, "type": "modified", "line": l_obj["line"]})
                right_rows.append({"text": r_segs, "type": "modified", "line": r_obj["line"]})
                
            # 2. Remaining Removes (if any) -> Left only
            for i in range(common_len, len(removes_buffer)):
                l_obj = removes_buffer[i]
                left_rows.append({"text": l_obj["text"], "type": "removed", "line": l_obj["line"]})
                right_rows.append({"text": "", "type": "empty"}) # Spacer
                
            # 3. Remaining Adds (if any) -> Right only
            for i in range(common_len, len(adds_buffer)):
                left_rows.append({"text": "", "type": "empty"}) # Spacer
                r_obj = adds_buffer[i]
                right_rows.append({"text": r_obj["text"], "type": "added", "line": r_obj["line"]})
                
            removes_buffer = []
            adds_buffer = []

        # Line Counters (1-based)
        left_n = 1
        right_n = 1

        for line in diff_gen:
            code = line[:2]
            text = line[2:]
            
            if code == "- ":
                removes_buffer.append({"text": text, "line": left_n})
                left_n += 1
            
            elif code == "+ ":
                adds_buffer.append({"text": text, "line": right_n})
                right_n += 1
                
            elif code == "  ":
                # Context line, flush any pending changes
                flush_buffers()
                left_rows.append({"text": text, "type": "same", "line": left_n})
                right_rows.append({"text": text, "type": "same", "line": right_n})
                left_n += 1
                right_n += 1
                
            # ndiff does not produce '@@' headers
        
        # Final flush
        flush_buffers()
                
        return {"diff": [], "left_rows": left_rows, "right_rows": right_rows}

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

@app.post("/api/save-file")
def save_file(req: SaveRequest):
    try:
        # Atomic write: write to temp file then rename
        # This prevents partial writes if process crashes
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

@app.post("/api/list-dirs")
def list_dirs(req: ListDirRequest):
    path = req.path
    if not path:
        # If empty, try to start from home or root
        path = os.path.expanduser("~")
    
    # Ensure absolute path to allow proper parent traversal
    path = os.path.abspath(path)
    
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



@app.get("/api/config")
def get_config():
    # Use the arguments parsed at module level
    return {
        "left": args.left,
        "right": args.right
    }

app.mount("/", StaticFiles(directory="backend/static", html=True), name="static")

if __name__ == "__main__":
    # If run directly as a script, start uvicorn
    # This allows: python -m backend.main --left ... --right ...
    uvicorn.run("backend.main:app", host="0.0.0.0", port=args.port, reload=True)
