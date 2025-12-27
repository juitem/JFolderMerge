import os
import hashlib
import fnmatch
from typing import List, Dict, Optional
from .models import FileNode


def get_file_hash(filepath: str, block_size=65536) -> str:
    hasher = hashlib.md5()
    try:
        with open(filepath, 'rb') as f:
            buf = f.read(block_size)
            while len(buf) > 0:
                hasher.update(buf)
                buf = f.read(block_size)
        return hasher.hexdigest()
    except Exception:
        return ""

def compare_folders(left_root: str, right_root: str, exclude_files: List[str] = [], exclude_folders: List[str] = []) -> FileNode:
    return _compare_recursive(left_root, right_root, "", exclude_files, exclude_folders)

def _compare_recursive(left_root: str, right_root: str, rel_path: str, exclude_files: List[str], exclude_folders: List[str]) -> FileNode:
    left_abs = os.path.join(left_root, rel_path)

    right_abs = os.path.join(right_root, rel_path)

    left_exists = os.path.exists(left_abs)
    right_exists = os.path.exists(right_abs)

    name = os.path.basename(rel_path) if rel_path else os.path.basename(left_root)
    
    left_name = None
    right_name = None
    if not rel_path:
        left_name = os.path.basename(left_root)
        right_name = os.path.basename(right_root)

    if not left_exists and not right_exists:
        # Should not happen if driven by parent listing
        return FileNode(name=name, path=rel_path, type="file", status="removed") # Fallback

    is_dir = False
    if left_exists:
        is_dir = os.path.isdir(left_abs)
    elif right_exists:
        is_dir = os.path.isdir(right_abs)

    node = FileNode(
        name=name,
        left_name=left_name,
        right_name=right_name,
        path=rel_path,
        type="directory" if is_dir else "file",
        status="same"
    )

    if not left_exists:
        node.status = "added"
    elif not right_exists:
        node.status = "removed"
    else:
        # Both exist
        if is_dir:
            if not os.path.isdir(right_abs):
                 # Type mismatch (Dir vs File)
                 node.status = "modified"
        else:
            if os.path.isdir(right_abs):
                 # Type mismatch
                 node.status = "modified"
            else:
                 # Both files
                 # Simple size check first
                 if os.path.getsize(left_abs) != os.path.getsize(right_abs):
                     node.status = "modified"
                 else:
                     # Hash check for exactness
                     if get_file_hash(left_abs) != get_file_hash(right_abs):
                         node.status = "modified"
                     else:
                         node.status = "same"
    
    if is_dir:
        children = []
        left_items = set()
        if left_exists and os.path.isdir(left_abs):
            left_items = set(os.listdir(left_abs))
            
        right_items = set()
        if right_exists and os.path.isdir(right_abs):
            right_items = set(os.listdir(right_abs))
        
        all_items = sorted(list(left_items | right_items))
        
        for item in all_items:
            # Check exclusions
            # Whether it's file or folder isn't fully known if it exists only on one side or both.
            # But we can check if it matches folder patterns or file patterns.
            # Usually we filter by name.
            
            # Simple heuristic: checks against both? 
            # Or check actual type on disk?
            item_left_abs = os.path.join(left_abs, item)
            item_right_abs = os.path.join(right_abs, item)
            
            is_item_dir = False
            if os.path.exists(item_left_abs):
                is_item_dir = os.path.isdir(item_left_abs)
            elif os.path.exists(item_right_abs):
                is_item_dir = os.path.isdir(item_right_abs)
            
            # Apply exclusion
            if is_item_dir:
                exclude = False
                for pattern in exclude_folders:
                    if fnmatch.fnmatch(item, pattern):
                        exclude = True
                        break
                if exclude: continue
            else:
                exclude = False
                for pattern in exclude_files:
                    if fnmatch.fnmatch(item, pattern):
                        exclude = True
                        break
                if exclude: continue

            child_rel = os.path.join(rel_path, item)
            child_node = _compare_recursive(left_root, right_root, child_rel, exclude_files, exclude_folders)
            children.append(child_node)
        
        node.children = children
        
        # Aggregate status for directories
        # If any child is not "same", directory is "modified" (conceptually)
        # But usually we just want to see the diffs inside.
        # Let's mark it as same unless it itself is added/removed, 
        # but UI might want to highlight if children have changes.
        # Araxis marks folders as 'containing changes'.
        # For now, keep simple status, UI can compute aggregations.
    
    return node
