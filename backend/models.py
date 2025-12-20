from pydantic import BaseModel
from typing import List, Optional, Literal

class FileNode(BaseModel):
    name: str
    path: str
    type: Literal["file", "directory"]
    status: Literal["same", "modified", "added", "removed"]
    children: Optional[List['FileNode']] = None

class CompareRequest(BaseModel):
    left_path: str
    right_path: str
    exclude_files: List[str] = []
    exclude_folders: List[str] = []

class ContentRequest(BaseModel):
    path: str

class DiffRequest(BaseModel):
    left_path: str
    right_path: str

class CopyRequest(BaseModel):
    source_path: str
    dest_path: str
    is_dir: bool

class ListDirRequest(BaseModel):
    path: str
