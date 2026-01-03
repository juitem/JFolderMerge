export type FileStatus = 'same' | 'modified' | 'added' | 'removed';
export type FileType = 'file' | 'directory';
export type DiffMode = 'unified' | 'side-by-side' | 'raw' | 'single' | 'combined' | 'agent';

export interface FileNode {
    name: string;
    path: string;
    type: FileType;
    status: FileStatus;
    children?: FileNode[];
    left_name?: string;
    right_name?: string;
    depth?: number; // Added for flat-list rendering
}

// TreeData is usually just the Root FileNode (merged)
export type TreeData = FileNode;

export interface Config {
    // Backend Paths
    left?: string;
    right?: string;
    ignoreFoldersPath?: string;
    ignoreFilesPath?: string;
    defaultIgnoreFolderFile?: string;
    defaultIgnoreFileFile?: string;

    // UI Settings (Persisted)
    folderFilters?: Record<string, boolean>;
    diffFilters?: Record<string, boolean>;
    viewOptions?: Record<string, boolean | string | number>; // e.g. folderViewMode, showLineNumbers, diffViewWrap, leftPanelWidth
    savedExcludes?: {
        folders?: string;
        files?: string;
    };
}

export interface DiffResult {
    // Generic typing for now, to be refined when moving DiffViewer
    left_rows?: any[]; // For side-by-side
    right_rows?: any[]; // For side-by-side
    diff?: string[]; // For unified
    mode: DiffMode;
}

export interface ListDirResult {
    current: string;
    parent: string;
    dirs: string[];
    files: string[];
}

export interface HistoryItem {
    left_path: string;
    right_path: string;
    timestamp: string;
}
