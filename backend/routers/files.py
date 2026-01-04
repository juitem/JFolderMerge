
import shutil
import os
from fastapi import APIRouter, HTTPException
from ..models import CopyRequest, SaveRequest, DeleteRequest, ListDirRequest, BatchCopyRequest, BatchDeleteRequest

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

@router.post("/batch-copy")
def batch_copy_items(req: BatchCopyRequest):
    created_paths = []
    try:
        for item in req.items:
            # 1. Check Source
            if not os.path.exists(item.source_path):
                raise Exception(f"Source not found: {item.source_path}")

            # 2. Prepare Dest
            dest_parent = os.path.dirname(item.dest_path)
            if not os.path.exists(dest_parent):
                os.makedirs(dest_parent, exist_ok=True)
            
            # 3. Copy
            if item.is_dir:
                if os.path.exists(item.dest_path):
                    shutil.rmtree(item.dest_path)
                shutil.copytree(item.source_path, item.dest_path)
            else:
                shutil.copy2(item.source_path, item.dest_path)
            
            created_paths.append(item.dest_path)

        return {"status": "success", "processed": len(created_paths)}

    except Exception as e:
        # Rollback: Delete all files/folders created during this transaction
        print(f"Batch Copy Failed: {e}. Rolling back {len(created_paths)} items.")
        for path in reversed(created_paths):
            try:
                if os.path.isdir(path):
                    shutil.rmtree(path)
                else:
                    os.remove(path)
            except Exception as rollback_error:
                print(f"Rollback failed for {path}: {rollback_error}")
        
        raise HTTPException(status_code=500, detail=f"Transaction Failed: {str(e)}")

@router.post("/batch-delete")
def batch_delete_items(req: BatchDeleteRequest):
    # Note: Rollback for delete is not supported without a Trash bin.
    # We will perform a 'check all' pass first to minimize partial failure risk, then delete.
    
    # 1. Validation Pass
    for path in req.paths:
        if not os.path.exists(path):
            # We can either fail strict or ignore. 
            # For transaction-like behavior, failing strict is better.
            raise HTTPException(status_code=404, detail=f"Path not found: {path}")

    # 2. Execution Pass
    deleted_paths = []
    try:
        for path in req.paths:
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)
            deleted_paths.append(path)
        
        return {"status": "success", "processed": len(deleted_paths)}

    except Exception as e:
        # Partial failure happened.
        raise HTTPException(
            status_code=500, 
            detail={
                "message": "Batch Delete Failed", 
                "error": str(e), 
                "deleted": deleted_paths
            }
        )

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
