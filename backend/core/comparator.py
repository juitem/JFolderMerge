import os
import filecmp
import shutil
import time
from typing import List, Dict, Any

def compare_folders(left_path: str, right_path: str, exclude_files: List[str] = [], exclude_folders: List[str] = []) -> Dict[str, Any]:
    """
    Recursively compares two folders and returns a tree structure indicating differences.
    """
    
    # Normalize paths
    left_path = os.path.abspath(left_path)
    right_path = os.path.abspath(right_path)
    
    # Base node
    root = {
        "name": os.path.basename(left_path) or left_path, # Fallback for root
        "left_name": os.path.basename(left_path) or left_path,
        "right_name": os.path.basename(right_path) or right_path,
        "path": "", # Root relative path is empty
        "type": "directory",
        "status": "same", # Will be updated
        "children": [],
        "left_path": left_path,
        "right_path": right_path
    }
    
    # Helper to walk
    def walk_compare(l_root, r_root, rel_path, current_node):
        # Check existence
        l_exists = os.path.exists(l_root)
        r_exists = os.path.exists(r_root)
        
        if not l_exists and not r_exists:
            return
            
        # If one doesn't exist, it's added/removed fully
        # But dircmp needs both to exist?
        # We handle "one side missing" manually?
        # Actually dircmp requires both to exist.
        
        if l_exists and r_exists:
            # Use dircmp
            dc = filecmp.dircmp(l_root, r_root, ignore=exclude_files + exclude_folders)
            
            # Process files and subdirs
            # dircmp provides: common, left_only, right_only, diff_files, same_files
            
            # 1. Common Files (Same or Diff)
            for name in dc.common_files:
                if name in exclude_files: continue
                
                status = "modified" if name in dc.diff_files else "same"
                current_node["children"].append({
                    "name": name,
                    "path": os.path.join(rel_path, name),
                    "type": "file",
                    "status": status
                })
                if status == "modified":
                     current_node["status"] = "modified"
                     
            # 2. Left Only
            for name in dc.left_only:
                # check if it's file or dir
                full_path = os.path.join(l_root, name)
                if os.path.isdir(full_path):
                    if name in exclude_folders: continue
                    child = {
                        "name": name,
                        "path": os.path.join(rel_path, name),
                        "type": "directory",
                        "status": "removed", # Removed from Right perspective (Left has it, Right doesn't)
                        "children": []
                    }
                    # We need to recurse to fill children as 'removed'
                    populate_single_side(full_path, child["path"], child, "removed")
                    current_node["children"].append(child)
                    current_node["status"] = "modified" # Contains differences
                elif os.path.isfile(full_path):
                    if name in exclude_files: continue
                    current_node["children"].append({
                        "name": name,
                        "path": os.path.join(rel_path, name),
                        "type": "file",
                        "status": "removed"
                    })
                    current_node["status"] = "modified"

            # 3. Right Only
            for name in dc.right_only:
                full_path = os.path.join(r_root, name)
                if os.path.isdir(full_path):
                    if name in exclude_folders: continue
                    child = {
                        "name": name,
                        "path": os.path.join(rel_path, name),
                        "type": "directory",
                        "status": "added",
                        "children": []
                    }
                    populate_single_side(full_path, child["path"], child, "added")
                    current_node["children"].append(child)
                    current_node["status"] = "modified"
                elif os.path.isfile(full_path):
                    if name in exclude_files: continue
                    current_node["children"].append({
                        "name": name,
                        "path": os.path.join(rel_path, name),
                        "type": "file",
                        "status": "added"
                    })
                    current_node["status"] = "modified"

            # 4. Common Subdirectories
            for name in dc.common_dirs:
                if name in exclude_folders: continue
                
                child = {
                    "name": name,
                    "path": os.path.join(rel_path, name),
                    "type": "directory",
                    "status": "same", # Assume same, child will update
                    "children": []
                }
                walk_compare(os.path.join(l_root, name), os.path.join(r_root, name), child["path"], child)
                
                # Update status based on children
                # If any child is not same, this folder is modified (or contains changes)
                # Usually we want "modified" if it contains changes.
                if child["status"] != "same":
                    current_node["status"] = "modified"
                # Wait, if child status is 'added'/'removed'/'modified', parent usually 'modified' (contains changes)
                # But if all children are same, parent is same.
                
                # Check children for non-same
                has_diff = any(c["status"] != "same" for c in child["children"])
                if has_diff:
                     child["status"] = "modified"
                     current_node["status"] = "modified"
                
                current_node["children"].append(child)

        else:
            # Should not happen via dircmp recursive path if we handle left_only/right_only
            pass

    def populate_single_side(root_path, rel_path, node, status):
        # Recursively list all files as 'status'
        try:
            with os.scandir(root_path) as it:
                for entry in it:
                     if entry.name.startswith('.'): continue
                     
                     if entry.is_dir():
                         if entry.name in exclude_folders: continue
                         child = {
                             "name": entry.name,
                             "path": os.path.join(rel_path, entry.name),
                             "type": "directory",
                             "status": status,
                             "children": []
                         }
                         populate_single_side(entry.path, child["path"], child, status)
                         node["children"].append(child)
                     elif entry.is_file():
                         if entry.name in exclude_files: continue
                         node["children"].append({
                             "name": entry.name,
                             "path": os.path.join(rel_path, entry.name),
                             "type": "file",
                             "status": status
                         })
        except OSError:
            pass

    walk_compare(left_path, right_path, "", root)
    
    # Sort children by name (directories first?)
    # Optional sorting logic
    def sort_tree(node):
        if "children" in node:
             node["children"].sort(key=lambda x: (x["type"] != "directory", x["name"]))
             for child in node["children"]:
                 sort_tree(child)
                 
    sort_tree(root)
    return root
