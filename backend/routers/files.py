
import shutil
import os
from fastapi import APIRouter, HTTPException
from ..models import CopyRequest, SaveRequest, DeleteRequest, ListDirRequest

router = APIRouter()

@router.get("/content")
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

@router.post("/copy")
def copy_item(req: CopyRequest):
    if not os.path.exists(req.source_path):
        raise HTTPException(status_code=400, detail="Source does not exist")
    
    dest_parent = os.path.dirname(req.dest_path)

    if not os.path.exists(dest_parent):
        os.makedirs(dest_parent, exist_ok=True)

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

@router.post("/save-file")
def save_file(req: SaveRequest):
    try:
        parent_dir = os.path.dirname(req.path)
        if not os.path.exists(parent_dir):
            os.makedirs(parent_dir, exist_ok=True)

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

@router.post("/delete")
def delete_item(req: DeleteRequest):
    print(f"DEBUG: DELETE request for path: {req.path}")
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

@router.post("/list-dirs")
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
