from backend.comparator import compare_folders
from backend.models import FileNode
import json

def find_node(node, name):
    if node.name == name:
        return node
    for child in (node.children or []):
        found = find_node(child, name)
        if found: return found
    return None

try:
    print("Comparing root...")
    res = compare_folders("/Users/juitem/Docker/ContainerFolder/FolderComp", "/Users/juitem/Docker/ContainerFolder/JF", [], [])
    
    settings_node = find_node(res, "settings")
    if settings_node:
        print(f"FOUND: settings (Status: {settings_node.status})")
    else:
        print("NOT FOUND: settings")

except Exception as e:
    print(f"Error: {e}")
