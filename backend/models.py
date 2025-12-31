from pydantic import BaseModel
from typing import List, Optional, Literal

class FileNode(BaseModel):
    name: str
    left_name: Optional[str] = None
    right_name: Optional[str] = None
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
    mode: Literal["unified", "side-by-side", "combined", "raw"] = "unified"

class CopyRequest(BaseModel):
    source_path: str
    dest_path: str
    is_dir: bool

class DeleteRequest(BaseModel):
    path: str

class HistoryRequest(BaseModel):
    left_path: str
    right_path: str
    timestamp: str = None  # Optional, can be set by server

class ExternalToolRequest(BaseModel):
    tool: str = "meld" # or "vscode", "idea", "opendiff", etc.
    left_path: str
    right_path: str


class ListDirRequest(BaseModel):
    path: str
    include_files: bool = False

class SaveRequest(BaseModel):
    path: str
    content: str
    
class ConfigUpdateRequest(BaseModel):
    left: Optional[str] = None
    right: Optional[str] = None
    folderFilters: Optional[dict] = None
    diffFilters: Optional[dict] = None
    viewOptions: Optional[dict] = None
    savedExcludes: Optional[dict] = None
