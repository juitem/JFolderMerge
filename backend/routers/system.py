
import json
import os
import shutil
import platform
import subprocess
import datetime
from fastapi import APIRouter, HTTPException
from ..models import HistoryRequest, ExternalToolRequest

router = APIRouter()

# Configuration
CONFIG_FILE = "settings/config.json"
HISTORY_FILE = "settings/history.json"

# We access 'args' via a getter or shared module? 
# For now, we will re-parse or dependency inject?
# Just rely on Main or Environment?
# Actually, Main parses args. We can put them in os.environ or a shared config module.
# Let's clean up Config loading.

# Minimal Config Loader
def load_config():
    # Defaults from args are tricky here without importing args from main.
    # Better to have settings module.
    # For now, minimal.
    config = {
        "ignoreFoldersPath": "IgnoreFolders",
        "ignoreFilesPath": "IgnoreFiles",
        "defaultIgnoreFolderFile": "default",
        "defaultIgnoreFileFile": "default"
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                file_config = json.load(f)
                config.update(file_config)
        except Exception:
            pass
    return config

@router.get("/config")
def get_config():
    return load_config()

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
