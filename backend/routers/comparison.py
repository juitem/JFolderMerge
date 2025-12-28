
from fastapi import APIRouter, HTTPException
from ..models import CompareRequest, DiffRequest, FileNode
from ..comparator import compare_folders
from ..core.differ import generate_side_by_side_diff, generate_unified_diff
import os

router = APIRouter()

@router.post("/compare", response_model=FileNode)
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

@router.post("/diff")
def get_diff(req: DiffRequest):
    try:
        if req.mode == "side-by-side":
            return generate_side_by_side_diff(req.left_path, req.right_path)
        elif req.mode == "combined":
            sbs = generate_side_by_side_diff(req.left_path, req.right_path)
            unified = generate_unified_diff(req.left_path, req.right_path)
            return {**sbs, **unified, "mode": "combined"}
        else:
            return generate_unified_diff(req.left_path, req.right_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
