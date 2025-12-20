from backend.comparator import compare_folders
import json

left = "/home/juitem/ContainerFolder/FolderComp/test/exclude/A"
right = "/home/juitem/ContainerFolder/FolderComp/test/exclude/B"

# Test with exclusion
result = compare_folders(
    left, 
    right, 
    exclude_files=[".tmp"], 
    exclude_folders=["__pycache__", "download"]
)

print(json.dumps(result.model_dump(), indent=2))
