# Sequence Diagrams

These diagrams detail the interactions between the User, React Frontend, and Python Backend for key operations.

## 1. Comparison Workflow

```mermaid
sequenceDiagram
    participant User
    participant App as React App
    participant API as Backend API
    participant FS as File System

    User->>App: Enter Left/Right Paths & Click "Compare"
    App->>API: POST /api/compare (left_path, right_path, excludes)
    
    activate API
    API->>FS: os.walk / scandir
    FS-->>API: File Lists & Metadata
    API->>API: Compute Status (Added/Removed/Modified)
    API-->>App: Return TreeData (JSON)
    deactivate API

    App->>App: Render FolderTree Component
    App-->>User: Display Comparison Results
```

## 2. Folder/File Merge Workflow (with Confirmation)

```mermaid
sequenceDiagram
    participant User
    participant App as React App
    participant Modal as ConfirmModal
    participant API as Backend API
    participant FS as File System

    User->>App: Click Merge Arrow (→ or ←) on Tree Item
    App->>Modal: Open Modal (Title, Message, Pending Action)
    Modal-->>User: Display "Are you sure?"
    
    alt User Cancels
        User->>Modal: click Cancel / Escape
        Modal->>App: Close Modal
        App-->>User: No Action
    else User Confirms
        User->>Modal: Click Confirm / Enter
        Modal->>App: Execute Pending Action
        activate App
        App->>API: POST /api/copy (src, dest, is_dir)
        
        activate API
        API->>FS: Check Dest Parent Existence
        alt Parent Missing
            API->>FS: os.makedirs(parent)
        end
        API->>FS: shutil.copy2 / copytree
        API-->>App: Success Response
        deactivate API
        
        App->>App: Trigger Re-Compare
        App->>API: POST /api/compare
        API-->>App: Updated TreeData
        App-->>User: Updated View
        deactivate App
    end
```

## 3. Line-Level Merge Workflow (Instant Action)

```mermaid
sequenceDiagram
    participant User
    participant DV as DiffViewer (Component)
    participant API as Backend API
    participant FS as File System

    Note over User, DV: Viewing Side-by-Side Diff
    User->>DV: Click Line Merge Arrow (→)
    
    activate DV
    DV->>DV: Calculate New File Content\n(Splice Source Text into Target Lines)
    
    DV->>API: POST /api/save-file (path, new_content)
    activate API
    
    API->>FS: Check Parent Directory
    alt Parent Missing
        API->>FS: os.makedirs(parent)
    end
    
    API->>FS: Write File (atomic replace)
    API-->>DV: Success Response
    deactivate API
    
    DV->>API: POST /api/diff (Reload Diff)
    API-->>DV: Updated Diff Lines
    DV-->>User: Re-render Updated Diff
    deactivate DV
```
