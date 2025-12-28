
import json
import os
import shutil
import platform
import subprocess
import datetime
from fastapi import APIRouter, HTTPException
from ..global_state import GlobalState
from ..models import HistoryRequest, ExternalToolRequest, ConfigUpdateRequest

router = APIRouter()

# Configuration
CONFIG_FILE = "settings/config.json"
HISTORY_FILE = "settings/history.json"

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
                if "ignoreFoldersPath" in file_config: config["ignoreFoldersPath"] = file_config["ignoreFoldersPath"]
                if "ignoreFilesPath" in file_config: config["ignoreFilesPath"] = file_config["ignoreFilesPath"]
                
                # Load UI Settings
                if "folderFilters" in file_config: config["folderFilters"] = file_config["folderFilters"]
                if "diffFilters" in file_config: config["diffFilters"] = file_config["diffFilters"]
                if "viewOptions" in file_config: config["viewOptions"] = file_config["viewOptions"]
                if "savedExcludes" in file_config: config["savedExcludes"] = file_config["savedExcludes"]
        except Exception:
            pass

    # 3. CLI Args override EVERYTHING (if present)
    if GlobalState.args:
        if GlobalState.args.left is not None: config["left"] = GlobalState.args.left
        if GlobalState.args.right is not None: config["right"] = GlobalState.args.right
    
    return config

@router.get("/config")
def get_config():
    return load_config()

@router.post("/config")
def save_config(req: ConfigUpdateRequest):
    # Load existing file config to preserve other keys
    file_config = {}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                file_config = json.load(f)
        except:
            pass
            
    # Update with new values
    if req.folderFilters is not None: file_config["folderFilters"] = req.folderFilters
    if req.diffFilters is not None: file_config["diffFilters"] = req.diffFilters
    if req.viewOptions is not None: file_config["viewOptions"] = req.viewOptions
    if req.savedExcludes is not None: file_config["savedExcludes"] = req.savedExcludes
        
    try:
        os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
        with open(CONFIG_FILE, 'w') as f:
            json.dump(file_config, f, indent=2)
        return {"status": "success", "config": file_config}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
def get_history():
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, 'r') as f:
            content = f.read()
            if not content:
                return []
            return json.loads(content)
    except Exception:
        return []

@router.post("/history")
def save_history(req: HistoryRequest):
    history = get_history()
    
    new_entry = {
         "left_path": req.left_path,
         "right_path": req.right_path,
         "timestamp": datetime.datetime.now().isoformat()
    }
    
    history = [h for h in history if not (h["left_path"] == req.left_path and h["right_path"] == req.right_path)]
    history.insert(0, new_entry)
    history = history[:10]
    
    try:
        with open(HISTORY_FILE, 'w') as f:
            json.dump(history, f, indent=2)
        return {"status": "success", "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/open-external")
def open_external(req: ExternalToolRequest):
    if not os.path.exists(req.left_path) or not os.path.exists(req.right_path):
        raise HTTPException(status_code=404, detail="One or more files not found")

    system = platform.system()
    tool = req.tool.lower()
    cmd = []
    
    if tool == "meld":
        cmd = ["meld", req.left_path, req.right_path]
    elif tool == "code" or tool == "vscode":
        cmd = ["code", "--diff", req.left_path, req.right_path]
    elif tool == "opendiff" or tool == "filemerge" or (tool == "default" and system == "Darwin"):
        cmd = ["opendiff", req.left_path, req.right_path]
    else:
        if shutil.which("meld"):
             cmd = ["meld", req.left_path, req.right_path]
        elif shutil.which("code"):
             cmd = ["code", "--diff", req.left_path, req.right_path]
        elif system == "Darwin":
             cmd = ["opendiff", req.left_path, req.right_path]
        else:
             raise HTTPException(status_code=501, detail="No suitable diff tool found")

    try:
        subprocess.Popen(cmd)
        return {"status": "success", "command": " ".join(cmd)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
